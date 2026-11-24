// ───────────── capabilities ─────────────
let SAMPLE = null, MCP = null, DB = null, DL = null;
function updMode(m) { const c = $('#modechip'); if (m) { c.textContent = m; c.classList.toggle('live', /라이브/.test(m)); return; } c.textContent = SAMPLE ? 'Claude 연결됨 · 라이브 가능' : '데모만 가능'; c.classList.toggle('live', !!SAMPLE); }
if (window.claude?.use) {
  claude.use('sample').then(s => { SAMPLE = s; updMode(); });
  claude.use('mcp').then(m => { MCP = m; });
  claude.use('db').then(d => { DB = d; });
  claude.use('downloads').then(d => { DL = d; });
} else updMode();
setTimeout(() => { if (!SAMPLE) updMode(); }, 11000);

const PROMPT_RULES = `규칙: 기사 문장을 그대로 옮기지 말고 짧게 재서술한다(직접 인용은 15자 이내). 기사에 없는 사실을 만들지 않는다. 실존 인물의 이름·얼굴을 특정하지 않는다. 확정되지 않은 내용은 단정하지 않는다. 한국어로 쓴다.`;
async function askJSON(dept, label, prompt, tier = 'default') {
  for (;;) {
    logit(dept, label, `sample · ${tier}`);
    try { return await SAMPLE.json(prompt, { modelTier: tier }); }
    catch (e) {
      const code = e?.code || 'upstream_error';
      if (code === 'not_granted' || code === 'sampling_disabled') { toast('이 화면에서는 Claude를 쓸 수 없어요. 데모 데이터로 이어갈게요.'); return null; }
      const r = await decide({ title: `${DEPTS[dept].name}의 작업이 멈췄어요 (${code})`, text: code === 'rate_limited' ? '잠시 뒤 다시 시도해 주세요.' : '응답을 받지 못했어요. 다시 시도하거나 데모 데이터로 이어갈 수 있어요.', submit: [{ label: '다시 시도', value: 'retry' }, { label: '데모 데이터로 계속', value: 'demo', ghost: true }] });
      if (r.value !== 'retry') return null;
    }
  }
}

// ───────────── browser MCP (Claude desktop app's built-in browser) ─────────────
const BR = 'host:claude_browser';
let TAB;
async function bcall(tool, input) {
  logit('reporter', `${tool} ${input.url ? clip(input.url, 60) : ''}`, `MCP · ${BR}`);
  const r = await MCP.callTool(BR, tool, input);
  return typeof r.payload === 'string' ? r.payload : (r.content || []).map(c => c.text || '').join('\n');
}
function parseArticle(raw, url) {
  const title = (/^Title:\s*(.+)$/m.exec(raw)?.[1] || '').trim();
  let [t, outlet] = title.split(/\s+[|:]{1,2}\s+/); outlet = (outlet || '').replace(/[:]+/g, '').trim();
  let body = raw.includes('\n---\n') ? raw.split('\n---\n').slice(1).join('\n') : raw;
  const cut = body.search(/Copyright|무단 ?전재|ⓒ|저작권자/); if (cut > 400) body = body.slice(0, cut);
  return { url, title: (t || title || '제목 없음').trim(), outlet: outlet || new URL(url).hostname.replace(/^www\./, ''), body: body.trim().slice(0, 9000) };
}
async function fetchArticle(url, who = 'reporter') {
  if (!MCP) return null;
  try {
    if (!TAB) { const t = await bcall('preview_start', { url }); TAB = /tabId\s+([^\s)]+)/.exec(t)?.[1]; }
    else await bcall('navigate', { url, tabId: TAB });
    await sleep(2600);
    let raw = await bcall('get_page_text', { tabId: TAB, max_chars: 16000 });
    if (raw.length < 600) { await sleep(2500); raw = await bcall('get_page_text', { tabId: TAB, max_chars: 16000 }); }
    return parseArticle(raw, url);
  } catch (e) { logit(who, `브라우저를 쓸 수 없음 (${e?.code || 'error'})`, `MCP · ${BR}`); return null; }
}
async function searchNews(query) {
  if (!MCP) return null;
  try {
    const url = 'https://search.daum.net/search?w=news&q=' + encodeURIComponent(query);
    if (!TAB) { const t = await bcall('preview_start', { url }); TAB = /tabId\s+([^\s)]+)/.exec(t)?.[1]; } else await bcall('navigate', { url, tabId: TAB });
    await sleep(2200);
    const tree = await bcall('read_page', { tabId: TAB, filter: 'interactive', max_chars: 40000 });
    const re = /link "([^"]{14,160})" \[ref_\d+\] href="(https?:\/\/v\.daum\.net\/v\/\d+)"/g; const seen = new Set(), out = [];
    for (const m of tree.matchAll(re)) { const href = m[2].replace('http:', 'https:'); if (seen.has(href)) continue; seen.add(href); out.push({ title: m[1].replace(/\\"/g, '"'), href }); if (out.length >= 12) break; }
    return out;
  } catch (e) { logit('reporter', `검색 실패 (${e?.code || 'error'})`, `MCP · ${BR}`); return null; }
}
async function askPaste(title, text, withLink) {
  const r = await decide({ title, text, textarea: { placeholder: '기사 본문을 붙여넣어 주세요' }, inputs: withLink ? [{ key: 'link', placeholder: '기사 링크 (선택)' }, { key: 'title', placeholder: '기사 제목' }] : [{ key: 'title', placeholder: '기사 제목' }], submit: [{ label: '이 본문으로 진행', value: 'ok' }, ...(withLink ? [{ label: '다음 기사 없이 진행', value: 'skip', ghost: true }] : [])] });
  if (r.value !== 'ok' || !r.text) return null;
  return { url: r.inputs.link || '', title: r.inputs.title || clip(r.text.split('\n')[0], 60), outlet: '붙여넣은 기사', body: r.text.slice(0, 9000) };
}

// ───────────── prompts ─────────────
const PR = {
  order: a => `너는 '나만의 AI 편집국'의 국장이다. 독자가 아래 기사를 탭했다. 부서에 내릴 지시서를 JSON으로만 답하라.
${PROMPT_RULES}
형식: {"section":"기사 면(사회/경제/정치/금융/교육 등)","date":"기사 날짜(모르면 빈 문자열)","summary":"한 문장 요약(60자 이내)","orders":{"reporter":"취재부 지시(50자 이내)","pd":"편성부 지시(50자 이내)","artist":"제작부 지시(50자 이내)"},"guardrails":["이 기사에서 특히 지킬 선 3~4개(각 30자 이내)"]}
기사 제목: ${a.title}
매체: ${a.outlet}
본문:
${a.body.slice(0, 5000)}`,
  analyze: a => `너는 편집국 취재부 기자다. 프라하 학파(마테지우스·다네시)의 테마-레마 이론과 반다이크의 뉴스 스키마로 기사를 분석한다.
- 테마: 이 기사가 무엇에 대한 이야기인지, 독자가 이미 알거나 제목에서 알 수 있는 부분.
- 레마: 이 기사가 새로 알려주는 내용 중 다른 관점(다른 면)의 다음 기사로 넘길 수 있는 '바통'.
${PROMPT_RULES}
기사를 6~8개 단위로 나눠라. 각 단위의 schema는 제목/리드/주요 사건/배경/결과·전망/반응/논평 중 하나. text는 30자 이내 재서술. tr은 "테마" 또는 "레마". why는 20자 이내 판단 근거.
그다음 레마 후보 3개를 골라라. 각각 다음 기사가 '다른 면'(원기사와 다른 섹션)에서 이어질 수 있어야 한다. rheme은 20자 이내, why는 50자 이내(왜 새 관점인지), section은 이어질 면, query는 그 다음 기사를 찾을 뉴스 검색어(2~5단어).
JSON으로만 답하라: {"theme":"30자 이내","units":[{"schema":"","text":"","tr":"테마","why":""}],"candidates":[{"rheme":"","why":"","section":"","query":""}]}
기사(${a.outlet} · ${a.section || ''}): ${a.title}
본문:
${a.body.slice(0, 7000)}`,
  pickB: (a, c, list) => `취재부 기자로서 다음 기사 B를 고른다. 기사 A의 레마 "${c.rheme}"(${c.why})가 B의 테마가 되어야 하고, B는 A와 다른 면(${c.section})이어야 한다. 같은 사건을 반복하는 기사는 피한다.
기사 A: ${a.title}
후보:
${list.map((x, i) => `${i}. ${x.title}`).join('\n')}
JSON으로만: {"index":번호,"why":"40자 이내"}`,
  analyzeB: (a, c, b) => `취재부 기자다. 기사 A의 레마 "${c.rheme}"를 바통으로 기사 B를 이어받았다. 기사 B를 분석하라.
${PROMPT_RULES}
JSON으로만: {"section":"B의 면","date":"날짜 또는 빈 문자열","summary":"B 한 문장 요약(60자)","theme":"B의 테마(30자)","rheme":"B의 레마(30자)","link":"A의 레마가 B의 테마가 되는 연결 설명(70자)","facts":["웹툰에 쓸 핵심 사실 3~4개(수치 포함, 각 45자 이내)"]}
기사 A: ${a.title}
기사 B(${b.outlet}): ${b.title}
B 본문:
${b.body.slice(0, 6000)}`,
  fit: (a, b, an) => `편성부 PD다. 이어진 두 기사를 세 매체(웹툰체·숏츠체·팟캐스트체)로 만들 때의 적합도를 0~100으로 매기고 이유를 쓴다. 매체만의 감각으로 판단한다: 웹툰체는 '멈춤'(사람의 마음·반응이 핵심인 레마), 숏츠체는 '흐름'(변화·수치·현장이 핵심인 레마), 팟캐스트체는 '대화'(다른 분야의 해석이 핵심인 레마)에 강하다. 선택은 독자가 한다.
기사 A: ${a.title} / 레마: ${an.chosen.rheme}
기사 B: ${b ? b.title : '(없음)'}
JSON으로만: {"webtoon":{"score":0,"why":"35자 이내"},"shorts":{"score":0,"why":""},"podcast":{"score":0,"why":""},"pick":"webtoon|shorts|podcast"}`,
  script: (a, b, an, ba) => `너는 제작부 웹툰 작가다. 기사 A에서 시작해 레마를 거쳐 기사 B로 이어지는 4컷 웹툰 대본을 쓴다.
표현적 특성(문장마다 고름): 말풍선 ${JSON.stringify(LIB.bubbles)}, 효과선 ${JSON.stringify(LIB.lines)}, 픽토그램 ${JSON.stringify(LIB.pictogram)}, 개념 효과글자(확인된 수치만), 굵은 강조(emphasis).
서사적 특성(기사 전체로 하나): ${LIB.narratives.join(', ')}.
쓸 수 있는 그림 재료 — 인물(who): ${JSON.stringify(LIB.cast)}, 표정(expr): ${JSON.stringify(LIB.expr)}, 배경(bg): ${JSON.stringify(LIB.bg)}.
${PROMPT_RULES} 대사가 실제 발언이 아니면 invented:true로 표시한다. 말풍선·캡션 글자는 각 26자 이내, 줄바꿈은 \\n.
컷 흐름: 1컷 기사 A 사실 → 2컷 레마(“${an.chosen.rheme}”)를 인물의 반응으로 → 3컷 레마가 B로 넘어가는 다리 → 4컷 기사 B의 핵심 사실(수치가 있으면 effect_text로).
why는 이 컷의 각 표현을 고른 이유(기사 내용 근거, 각 45자 이내): caption·bubbles(배열)·fx·pic·lines. role은 이 컷이 서사에서 맡은 역할(50자 이내). evidence는 근거가 된 기사 원문 속 짧은 구절을 그대로(12자 이내).
layout은 "single" 또는 "split"(두 입장 대비, cast 2명). source는 "A","레마","B" 중 하나. fact는 그 컷의 근거가 된 기사 내용(45자 이내 재서술). prompt는 이 컷을 이미지 생성 모델에 줄 영어 프롬프트(modern Korean webtoon style, no text).
JSON으로만:
{"narrative":{"type":"서사 유형","why":"기사 내용 근거 70자 이내"},"expressive":[{"feature":"고른 표현","why":"기사 내용 근거 45자 이내"}],
"cuts":[{"n":1,"source":"A","fact":"","layout":"single","bg":"exam","cast":[{"who":"jobseeker","expr":"shock","pos":"left","size":"mid"}],"caption":"문장 또는 null","emphasis":"caption 속 강조어 또는 null","bubbles":[{"type":"burst","who":"jobseeker","text":"","invented":true}],"effect_text":null,"pictogram":null,"lines":"none","why":{"caption":"","bubbles":[""],"fx":"","pic":"","lines":""},"role":"","evidence":"","prompt":""}]}
기사 A(${a.outlet}, ${a.section || ''}): ${a.title}
A 테마: ${an.theme} / 고른 레마: ${an.chosen.rheme} — ${an.chosen.why}
A 요약: ${clip(a.body, 1200)}
${b ? `기사 B(${b.outlet}, ${ba.section || b.section || ''}): ${b.title}\nB 테마: ${ba.theme} / 연결: ${ba.link}\nB 핵심 사실: ${(ba.facts || []).join(' / ')}` : '기사 B 없음: 3~4컷은 레마가 여는 질문으로 마무리한다.'}`,
  review: (a, b, cuts) => `너는 편집국 국장이다. 완성된 웹툰 컷을 원문과 대조해 검수한다. 기준: 사실 대조(수치·날짜·인물), 인용 대조(실제 발언이 아니면 invented 표시가 있는가), 연결 근거, 표현 수위(과장 여부), 출처.
문제가 있으면 verdict "수정"과 함께 fixed에 고친 문장을 준다(field는 "caption" 또는 "bubble0","bubble1"). 문제없으면 "통과".
JSON으로만: [{"n":1,"verdict":"통과","check":"사실 대조","issue":"35자 이내","field":null,"fixed":null}]
기사 A: ${a.title}
A 내용: ${clip(a.body, 2500)}
${b ? `기사 B: ${b.title}\nB 내용: ${clip(b.body, 2500)}` : ''}
컷: ${JSON.stringify(cuts.map(c => ({ n: c.n, source: c.source, caption: c.caption, bubbles: (c.bubbles || []).map(x => ({ text: x.text, invented: x.invented })), effect_text: c.effect_text })))}`,
  revise: (cuts, comment) => `너는 제작부 작가다. 독자가 검수 단계에서 의견을 남겼다. 의견을 반영해 컷을 고쳐라. 사실을 바꾸거나 새 사실을 만들지 말고 표현·대사·구성만 바꾼다. 같은 구조의 전체 cuts 배열을 JSON으로만 답하라.
독자 의견: ${comment}
현재 컷: ${JSON.stringify(cuts.map(({ img, ratio, ...c }) => c))}`
};

// ───────────── the run ─────────────
let RUN = null; let busy = false;
function resetStage() {
  duty('chief', 'reporter', 'pd', 'artist');
  ['chief', 'reporter', 'pd', 'artist'].forEach(k => { const a = A[k]; a.place(DEPTS[k].home); a.carry(null); a.hush(); a.status('대기'); a.chatting = false; a.el.classList.remove('chat'); });
  A.chief.face('left'); A.reporter.face('left'); A.pd.face('left'); A.artist.face('right');
  boardS.innerHTML = ''; tvS.innerHTML = ''; monS.innerHTML = ''; corkS.innerHTML = '';
  [chalk, tvClose, monClose, reviewClose, motionClose].forEach(f => show(f, false));
  camera(null); cardReset(); $('#log').innerHTML = ''; RUNLOG.length = 0; setStep(-1); stepLabel(4, '매체 제작'); verMedia('webtoon');
  if (typeof playerStop === 'function') playerStop();
}
function useDemo(r, key) { r.demoUsed.add(key); return structuredClone(DEMO[key]); }
const later = (ms, fn) => (async () => { await wait(ms); return fn(); })();   // start something in parallel

async function run(mode, url) {
  if (busy) return; busy = true; $('#go').disabled = $('#demo').disabled = true;
  resetStage();
  const live = mode === 'live' && !!SAMPLE;
  updMode(live ? '라이브 실행 중' : '데모 실행 중');
  RUN = { mode: live ? 'live' : 'demo', started: new Date().toISOString(), demoUsed: new Set() };
  try {
    // 1 · 관심 기사 탭 — the whole floor reacts at once
    setStep(0); camera(null);
    let a;
    if (!live) { a = useDemo(RUN, 'A'); if (url) logit('reader', `관심 기사 링크: ${url}`); }
    else {
      logit('reader', `관심 기사 탭: ${url}`);
      A.reporter.think('기사 원문 여는 중'); A.chief.sayNow('링크 들어왔다. 원문부터 열어 봐', 2200);
      a = await fetchArticle(url); A.reporter.hush(); A.reporter.status('대기');
      if (!a || a.body.length < 200) a = await askPaste('기사 본문을 붙여넣어 주세요', '이 화면에서는 링크를 직접 열 수 없어요(브라우저 MCP는 Claude 데스크톱 앱에서 열었을 때만 작동). 기사 본문을 복사해 넣으면 그대로 진행해요.', false);
      if (!a) { toast('본문이 없어 멈췄어요.'); return; }
      a.url = a.url || url;
    }
    RUN.A = a; $('#src').innerHTML = `<h5>기사 A · ${esc(a.outlet)}</h5><a href="${esc(a.url)}" target="_blank" rel="noopener">${esc(a.title)}</a>\n\n${esc(a.body)}`;
    logit('reader', `관심 기사를 탭함 — ${clip(a.title, 40)}`);
    ['reporter', 'pd', 'artist'].forEach(k => A[k].faceTo(A.chief));
    await Promise.all([flyPaper(a.title), talk([[A.reporter, '새 기사 들어왔다!', 250, 1900], [A.pd, '어느 면이에요?', 650, 1800], [A.artist, '오, 무슨 기사?', 1000, 1700], [A.chief, `<b>${esc(clip(a.outlet, 8))}</b> 기사야. 다들 준비!`, 1300, 2000]])]);

    // 2 · 국장 지시 — the reporter walks over while the order is still being written
    setStep(1); duty('chief', 'reporter'); camera([0.5, 0.5], 1.2);
    A.chief.think('지시서 작성 중');
    const rCome = later(500, async () => { await A.reporter.walkTo('meetReporter', { status: '지시 받으러 가는 중' }); A.reporter.faceTo(A.chief); A.reporter.status('지시 대기'); A.reporter.say('국장님, 지시서 주시면 바로 갈게요', 2000); });
    let order = live ? await askJSON('chief', '지시서 작성', PR.order(a), 'quick') : null;
    if (!order) { await wait(1800); order = useDemo(RUN, 'order'); }
    a.section = a.section || order.section || ''; a.date = a.date || order.date || '';
    A.chief.hush(); A.chief.status('지시');
    cardAdd(0, '기사 A', `${a.outlet}${a.section ? ' · ' + a.section : ''}${a.date ? ' · ' + a.date : ''}\n${a.title}`);
    cardAdd(0, '한 줄 요약', order.summary);
    cardAdd(0, '취재부 지시', order.orders?.reporter || '');
    cardAdd(0, '편성부 지시', order.orders?.pd || '');
    cardAdd(0, '제작부 지시', order.orders?.artist || '');
    cardAdd(0, '지켜야 할 선', (order.guardrails || []).map(g => '· ' + g).join('\n'));
    cardHold('chief'); A.chief.carry(ctxChip(0, 'chief'));
    logit('chief', '지시서 v0 작성 — 취재부·편성부·제작부 배정');
    A.chief.sayNow(`<b>지시서 v0</b> 완성!`, 1500);
    await Promise.all([A.chief.walkTo('meetChief', { status: '취재부에 전달' }), rCome]);
    await handoff(A.chief, A.reporter, ctxChip(0, 'chief'), '받아 가. 바통이 될 <b>레마</b>를 찾아와.', '넵! 칠판으로 갑니다'); cardHold('reporter');

    // 3 · 취재부: 테마/레마 → 다음 기사 — the chief follows to watch the board
    setStep(2); camera([0.2, 0.5], 1.32);
    const cFollow = later(600, async () => { await A.chief.walkTo('boardWatch', { status: '분석 지켜보는 중' }); A.chief.faceTo(A.reporter); });
    await A.reporter.walkTo('board', { face: 'left', after: '칠판 분석' });
    A.reporter.think('테마·레마 분석 중');
    boardS.innerHTML = `<h4>${esc(clip(a.title, 22))}</h4>`; chalk.innerHTML = `<div style="font-size:2.3cqw;color:#FFF7C2">${esc(clip(a.title, 40))}</div><div style="font-size:1.25cqw;color:#cfe;opacity:.8;margin-bottom:.6cqw">${esc(a.outlet)} · 테마(아는 부분) / 레마(새로 알려준 것 → 다음 기사로 넘길 바통)</div><div id="chalkRows"></div><div id="chalkCand"></div>`; show(chalk);
    let an = live ? await askJSON('reporter', '테마·레마 분석', PR.analyze(a), 'default') : null;
    if (!an || !an.units?.length) { await wait(1500); an = useDemo(RUN, 'analysis'); }
    await cFollow;
    A.reporter.hush(); A.reporter.status('칠판에 메모', true);
    const rows = $('#chalkRows'); let firstR = true;
    const units = an.units.slice(0, 8);
    for (const [ui, u] of units.entries()) {
      const isR = /레마/.test(u.tr);
      const r = el('div'); r.style.cssText = `display:flex;gap:.8cqw;align-items:baseline;font-size:1.75cqw;line-height:1.15;margin:.15cqw 0;color:${isR ? '#FFE27A' : '#DDEBFF'};opacity:0;transform:translateX(-8px);transition:all .4s`;
      r.innerHTML = `<span style="flex:0 0 auto;font-size:1.25cqw;border:1.5px solid currentColor;border-radius:.4cqw;padding:0 .45cqw">${esc(u.schema)}</span><span style="${isR ? 'text-decoration:underline wavy rgba(255,226,122,.7);text-underline-offset:.35cqw' : ''}">${esc(u.text)}</span><span style="margin-left:auto;flex:0 0 auto;font-size:1.3cqw;opacity:.85">${isR ? '레마' : '테마'} · ${esc(u.why || '')}</span>`;
      rows.append(r); await wait(60); r.style.opacity = 1; r.style.transform = 'none';
      const mini = el('div', 'row ' + (isR ? 'rheme' : 'theme')); mini.innerHTML = `<span class="tag">${esc(u.schema)}</span><span class="txt">${esc(clip(u.text, 16))}</span>`; boardS.append(mini); await wait(30); mini.classList.add('in');
      A.reporter.sayNow(`${esc(u.schema)} → <b>${isR ? '레마' : '테마'}</b>`, 900);
      if (isR && firstR) { firstR = false; later(350, () => A.chief.say('그거! 새로 알려준 거니까 <b>레마</b>', 1900)); }
      else if (ui === 2) later(300, () => A.chief.say('테마는 짧게 짚고 넘어가', 1700));
      else if (ui === units.length - 1) later(300, () => A.chief.say('좋아, 바통 후보를 뽑아 봐', 1700));
      await wait(720);
    }
    cardAdd(1, '테마', an.theme);
    cardAdd(1, '레마 후보', an.candidates.map((c, i) => `${i + 1}. ${c.rheme} → ${c.section}`).join('\n'));
    const cand = $('#chalkCand'); cand.style.cssText = 'margin-top:.8cqw;border-top:2px dashed rgba(255,255,255,.3);padding-top:.5cqw';
    cand.innerHTML = `<div style="font-size:1.6cqw;color:#FFD3B0">바통 후보 — 어떤 레마로 이어 갈까?</div>` + an.candidates.map((c, i) => `<div style="font-size:1.6cqw;color:#FFE9D6">${i + 1}. “${esc(c.rheme)}” → ${esc(c.section)} <span style="opacity:.75;font-size:1.3cqw">${esc(c.why)}</span></div>`).join('');
    await talk([[A.reporter, '레마 후보 세 개 적었어요. <b>어느 바통</b>으로 갈까요?', 0, 3200], [A.chief, '이건 <b>독자</b>가 고르게 하자', 900, 2600]]);
    const pickR = await decide({ title: '어떤 레마를 다음 기사로 넘길까요?', text: '취재부가 기사에서 새로 알려준 내용(레마) 중 다른 면으로 이어질 수 있는 후보를 골랐어요.', choices: an.candidates.map((c, i) => ({ label: `“${c.rheme}”`, desc: c.why, small: `이어질 면: ${c.section} · 검색어: ${c.query}`, value: i })) });
    an.chosen = an.candidates[pickR.value]; RUN.analysis = an;
    logit('reader', `레마 선택 — “${an.chosen.rheme}”`);
    cardAdd(1, '고른 레마(바통)', an.chosen.rheme, { hitl: true });
    talk([[A.reporter, `“${esc(clip(an.chosen.rheme, 14))}”로 갑니다!`, 0, 1800], [A.chief, '좋아, <b>다른 면</b>에서 찾아와', 500, 1800]]);
    const chainLine = el('div', 'chain in'); chainLine.textContent = `→ ${clip(an.chosen.rheme, 14)} → ?`; boardS.append(chainLine);
    later(1400, () => A.chief.walkTo('chiefDesk', { after: '지휘 중', face: 'left' }));
    // the PD starts walking over to pick up the card while the search is still running
    duty('reporter', 'pd'); onDuty('chief');
    later(2600, () => offDuty('chief'));
    const pCome = later(2200, async () => { await A.pd.walkTo('pdMeetP', { status: '카드 받으러 가는 중' }); A.pd.status('카드 대기'); A.pd.faceTo(A.reporter); });
    await wait(900);
    A.reporter.think(`'${clip(an.chosen.query, 12)}' 검색 중`);
    let b = null, ba = null;
    if (live) {
      const list = await searchNews(an.chosen.query);
      if (list?.length) {
        chalk.querySelector('#chalkCand').insertAdjacentHTML('beforeend', `<div style="margin-top:.5cqw;font-size:1.35cqw;color:#cfe">검색 결과 ${list.length}건: ${list.slice(0, 3).map(x => esc(clip(x.title, 22))).join(' / ')}</div>`);
        const pk = await askJSON('reporter', '다음 기사 고르기', PR.pickB(a, an.chosen, list), 'quick');
        const pick = list[Math.max(0, Math.min(list.length - 1, +(pk?.index ?? 0)))];
        logit('reporter', `다음 기사 후보 선택 — ${clip(pick.title, 40)}${pk?.why ? ' (' + pk.why + ')' : ''}`);
        b = await fetchArticle(pick.href);
        if (b) { b.title = b.title || pick.title; }
      }
      if (!b) b = await askPaste('다음 기사 B를 직접 넣어 주세요', `검색어 “${an.chosen.query}”로 ${an.chosen.section} 기사를 찾아 본문을 붙여넣거나, B 없이 진행할 수 있어요.`, true);
      if (b) { ba = await askJSON('reporter', '기사 B 분석', PR.analyzeB(a, an.chosen, b), 'default'); if (!ba) ba = { summary: clip(b.body, 60), theme: an.chosen.rheme, rheme: '', link: `A의 레마 '${an.chosen.rheme}'가 B로 이어짐`, facts: [] }; b.section = ba.section || b.section || an.chosen.section; b.date = ba.date || ''; }
    } else {
      chalk.querySelector('#chalkCand').insertAdjacentHTML('beforeend', `<div style="margin-top:.5cqw;font-size:1.35cqw;color:#cfe">검색 “${esc(an.chosen.query)}” → ${DEMO.searchList.map(x => esc(clip(x, 24))).join(' / ')}</div>`);
      logit('reporter', `다음 기사 검색 “${an.chosen.query}”`, 'MCP · host:claude_browser (데모 재생)');
      await wait(2200); b = useDemo(RUN, 'B'); ba = useDemo(RUN, 'bAnalysis');
    }
    RUN.B = b; RUN.bAnalysis = ba; A.reporter.hush();
    if (b) {
      $('#src').innerHTML += `\n\n<h5>기사 B · ${esc(b.outlet)}</h5>${b.url ? `<a href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.title)}</a>` : esc(b.title)}\n\n${esc(b.body)}`;
      chainLine.textContent = `→ ${clip(an.chosen.rheme, 10)} → ${clip(b.title, 12)}`;
      chalk.insertAdjacentHTML('beforeend', `<div style="margin-top:.7cqw;font-size:1.75cqw;color:#C8F7C5">A의 레마 “${esc(an.chosen.rheme)}” ⟶ B의 테마 “${esc(ba.theme)}”</div><div style="font-size:1.35cqw;color:#C8F7C5;opacity:.85">${esc(b.outlet)}${b.section ? ' · ' + esc(b.section) : ''} — ${esc(clip(b.title, 44))}</div>`);
      cardAdd(1, '다음 기사 B', `${b.outlet}${b.section ? ' · ' + b.section : ''}${b.date ? ' · ' + b.date : ''}\n${b.title}`);
      cardAdd(1, '연결 근거', ba.link);
      cardAdd(1, 'B 핵심 사실', (ba.facts || []).map(f => '· ' + f).join('\n'));
      A.reporter.sayNow(`찾았어요! <b>${esc(clip(b.outlet, 8))}</b> 기사로 바통이 넘어가요.`, 2000);
    } else { cardAdd(1, '다음 기사 B', '없음 — 레마가 여는 질문으로 마무리'); }
    A.reporter.carry(ctxChip(1, 'reporter'));
    await wait(1200); show(chalk, false); camera([0.56, 0.52], 1.18);
    await Promise.all([A.reporter.walkTo('pdMeetR', { status: '편성부로 이동' }), pCome]);
    await handoff(A.reporter, A.pd, ctxChip(1, 'reporter'), '카드 v1이에요. <b>A → 레마 → B</b>까지 담았어요.', '오케이, 바로 매체 회의!'); cardHold('pd');
    offDuty('reporter'); later(400, () => A.reporter.walkTo('reporterHome', { after: '대기', face: 'left' }));

    // 4 · 편성부: 매체 적합도 → 독자 선택 — the artist joins the meeting
    setStep(3); duty('pd', 'artist'); camera([0.7, 0.45], 1.3);
    const aJoin = later(700, async () => { await A.artist.walkTo('artistAtPd', { status: '편성 회의 참석' }); A.artist.faceTo(A.pd); A.artist.status('회의 중'); });
    await A.pd.walkTo('pdDesk', { face: 'left', after: '편성 회의' });
    A.pd.think('매체 적합도 계산');
    let fit = live ? await askJSON('pd', '매체 적합도 평가', PR.fit(a, b, an), 'quick') : null;
    if (!fit?.webtoon) { await wait(1500); fit = useDemo(RUN, 'fit'); }
    if (!fit.podcast) fit.podcast = fit.playlist || { score: 0, why: '' };
    RUN.fit = fit; A.pd.hush(); A.pd.status('독자 선택 대기', true);
    const mrow = (k, n) => `<div class="opt" data-k="${k}"><b style="width:5.5em">${n}</b><div class="bar"><i></i></div><span>${fit[k]?.score ?? 0}</span></div>`;
    tvS.innerHTML = `<h5>편성 회의 · 매체 적합도</h5>${mrow('webtoon', '웹툰체')}${mrow('shorts', '숏츠체')}${mrow('podcast', '팟캐스트체')}`;
    tvClose.innerHTML = `<div style="font-size:1.5cqw;color:#9FC2FF;font-weight:600;margin-bottom:.6cqw">편성 회의 — 매체 적합도 (참고용, 선택은 독자)</div>` + ['webtoon', 'shorts', 'podcast'].map(k => `<div class="opt" data-k="${k}" style="display:flex;align-items:center;gap:.8cqw;margin:.5cqw 0;padding:.6cqw .8cqw;border-radius:.6cqw;background:rgba(255,255,255,.06);border:2px solid transparent;font-size:1.3cqw"><b style="width:5em">${{ webtoon: '웹툰체', shorts: '숏츠체', podcast: '팟캐스트체' }[k]}</b><div style="flex:1;height:.6cqw;border-radius:.3cqw;background:rgba(255,255,255,.12);overflow:hidden"><i style="display:block;height:100%;width:0;background:#7FB3FF;transition:width 1.2s"></i></div><span style="width:2em;text-align:right">${fit[k]?.score ?? 0}</span><span style="flex:0 0 46%;color:#B8C8E8;font-size:1.1cqw">${esc(fit[k]?.why || '')}</span></div>`).join('');
    show(tvClose); await wait(80);
    [tvS, tvClose].forEach(s => s.querySelectorAll('.opt').forEach(o => { o.querySelector('i').style.width = (fit[o.dataset.k]?.score || 0) + '%'; }));
    await aJoin;
    await talk([[A.pd, '세 매체 적합도 나왔어요. <b>고르는 건 독자</b>예요.', 0, 3000], [A.artist, '웹툰이면 그리고, 팟캐스트면 녹음할게요!', 1000, 2400]]);
    const pickM = await decide({ title: '어떤 매체로 볼까요?', text: '편성부 점수는 참고용이에요. 이번 실험에서는 웹툰체와 팟캐스트체를 만들어요.', choices: [
      { label: '웹툰체', desc: fit.webtoon.why, small: `적합도 ${fit.webtoon.score}`, rec: fit.pick === 'webtoon', value: 'webtoon' },
      { label: '숏츠체 (준비 중)', desc: fit.shorts.why, small: `적합도 ${fit.shorts.score}`, disabled: true, value: 'shorts' },
      { label: '팟캐스트체', desc: fit.podcast.why, small: `적합도 ${fit.podcast.score} · 소리 · 대화`, rec: fit.pick === 'podcast', value: 'podcast' }] });
    RUN.media = pickM.value; A.pd.hush();
    [tvS, tvClose].forEach(s => s.querySelectorAll('.opt').forEach(o => { const on = o.dataset.k === pickM.value; o.style.borderColor = on ? 'var(--human)' : 'transparent'; o.style.opacity = on ? 1 : .45; }));
    const MN = { webtoon: '웹툰체', shorts: '숏츠체', podcast: '팟캐스트체' }[pickM.value];
    logit('reader', '매체 선택 — ' + MN);
    cardAdd(2, '매체 적합도', `웹툰체 ${fit.webtoon.score} · 숏츠체 ${fit.shorts.score} · 팟캐스트체 ${fit.podcast.score}\n추천: ${{ webtoon: '웹툰체', shorts: '숏츠체', podcast: '팟캐스트체' }[fit.pick] || '-'}`);
    cardAdd(2, '선택한 매체', MN, { hitl: true });
    A.pd.carry(ctxChip(2, 'pd'));
    stepLabel(4, pickM.value === 'podcast' ? '팟캐스트 제작' : '웹툰 제작');
    await talk([[A.pd, `<b>${MN}</b>로 편성!`, 0, 1500], [A.artist, pickM.value === 'podcast' ? '녹음 부스 예약할게요!' : '좋아요, 바로 갑니다!', 450, 1500]]);
    await handoff(A.pd, A.artist, ctxChip(2, 'pd'), pickM.value === 'podcast' ? '카드 v2. 소리·서사·게스트는 <b>기사 근거</b>로!' : '카드 v2. 표현·서사는 <b>기사 근거</b>로!', '근거 표시까지 할게요'); cardHold('artist');
    show(tvClose, false);
    if (pickM.value === 'podcast') { await runPodcast(a, b, an, ba, live); return; }

    // 5 · 제작부: 표현/서사 → 컷 대본 → 이미지 → 모션 — others drop by to watch the cork board
    setStep(4); duty('artist'); camera([0.74, 0.7], 1.25);
    later(500, () => A.pd.walkTo('pdDesk', { after: '대기', face: 'left' }));
    await A.artist.walkTo('artistDesk', { face: 'right', after: '작업 중' });
    A.artist.think('표현·서사 고르는 중');
    let sc = live ? await askJSON('artist', '표현·서사 선택 + 컷 대본', PR.script(a, b, an, ba || {}), 'default') : null;
    if (!sc?.cuts?.length) { await wait(1600); sc = useDemo(RUN, 'script'); }
    sc.cuts = sc.cuts.slice(0, 5).map((c, i) => ({ ...c, n: i + 1 }));
    RUN.script = sc; A.artist.hush();
    cardAdd(3, '서사 유형', `${sc.narrative.type}\n근거: ${sc.narrative.why}`);
    cardAdd(3, '표현 선택', (sc.expressive || []).map(x => `· ${x.feature} — ${x.why}`).join('\n'));
    cardAdd(3, '컷 대본', sc.cuts.map(c => `${c.n}컷[${c.source}] ${(c.caption || c.bubbles?.[0]?.text || '').replace(/\n/g, ' ')}`).join('\n'));
    A.artist.sayNow(`서사는 <b>${esc(sc.narrative.type)}</b>. 텍스트를 이미지로 바꿀게요.`, 2000);
    // reporter + PD come over to watch; the chief heads to the review table early
    onDuty('reporter', 'pd', 'chief');
    later(600, async () => { await A.reporter.walkTo('corkWatchR', { status: '컷 구경' }); A.reporter.face('right'); });
    later(1500, async () => { await A.pd.walkTo('corkWatchP', { status: '컷 구경' }); A.pd.face('right'); });
    later(3000, async () => { await A.chief.walkTo('reviewChief', { status: '검수 준비', face: 'right' }); A.chief.say('원문 대조표 펼쳐 둘게', 1800); });
    monClose.innerHTML = `<div style="display:flex;justify-content:space-between;font-size:1.25cqw;color:#8FB4FF;font-weight:600;margin-bottom:.4cqw"><span id="mcT">텍스트 → 이미지</span><span id="mcN"></span></div><div id="mcP" style="font:1.1cqw/1.45 ui-monospace,Menlo,monospace;color:#CFE0FF;height:7.6cqw;overflow:hidden;white-space:pre-wrap"></div><div style="height:.5cqw;border-radius:.3cqw;background:rgba(255,255,255,.1);margin:.6cqw 0;overflow:hidden"><i id="mcB" style="display:block;height:100%;width:0;background:linear-gradient(90deg,#7FB3FF,#B07CC6)"></i></div><div id="mcO" style="position:relative"></div>`;
    show(monClose); monS.innerHTML = `<div class="lbl"><span>PROMPT</span><span id="msN"></span></div><div class="prompt" id="msP"></div><div class="prog"><i id="msB"></i></div>`;
    const thumbs = [];
    const watchLines = sc.cuts.map((c, i) => [i % 2 ? A.pd : A.reporter, [
      c.source === 'A' ? '시험장 분위기 확 산다' : c.source === 'B' ? (c.effect_text ? '수치가 한눈에 들어오네' : 'B로 넘어가는 다리네') : '레마가 표정에 살았어!',
      '이 컷 좋다', '말풍선 위치 딱이네'][i > 3 ? 1 + (i % 2) : 0]]);
    for (const c of sc.cuts) {
      A.artist.status(`${c.n}컷 생성 중`, true);
      $('#mcN').textContent = `${c.n} / ${sc.cuts.length}컷`; $('#msN').textContent = `${c.n}/${sc.cuts.length}`;
      const txt = c.prompt || `${LIB.bg[c.bg] || ''}, ${(c.cast || []).map(x => LIB.cast[x.who] + ' ' + (LIB.expr[x.expr] || '')).join(', ')}`;
      $('#mcP').textContent = ''; $('#msP').textContent = ''; $('#mcB').style.transition = 'none'; $('#mcB').style.width = '0'; $('#msB').style.width = '0'; $('#mcO').innerHTML = '';
      for (let k = 0; k <= txt.length; k += 4) { $('#mcP').textContent = txt.slice(0, k); $('#msP').textContent = txt.slice(0, k); await wait(16); }
      await wait(50); $('#mcB').style.transition = `width ${1.3 / SPEED}s linear`; $('#mcB').style.width = '100%'; $('#msB').style.transition = `width ${1.3 / SPEED}s linear`; $('#msB').style.width = '100%';
      await wait(1350);
      const pv = renderPanel(c, c.n - 1); pv.style.margin = '0'; pv.style.borderRadius = '.4cqw'; $('#mcO').append(pv);
      const pin = el('div', 'pin'); const pin2 = renderPanel(c, c.n - 1); pin2.style.margin = '0'; pin2.style.width = '100%'; pin.append(pin2); corkS.append(pin); await wait(30); pin.classList.add('in');
      thumbs.push(panelThumbURL(c)); logit('artist', `${c.n}컷 생성 — ${c.source} · ${(c.bubbles || []).map(x => x.type).concat(c.caption ? ['rect'] : []).join('/') || '그림'} · 효과선 ${c.lines || 'none'}`, c.img ? '이미지 생성 결과(데모 원화)' : '에셋 합성 렌더');
      A.artist.sayNow(`${c.n}컷 완성!`, 1000);
      const [wAg, wLine] = watchLines[c.n - 1]; later(450, () => wAg.say(esc(wLine), 1700));
      await wait(1000);
    }
    cardAdd(4, '생성 이미지', { text: `${sc.cuts.length}컷 · ${RUN.mode === 'demo' ? '데모 원화(ChatGPT 이미지로 생성)' : '에셋 라이브러리 합성'}`, thumbs });
    cardAdd(4, '이미지 프롬프트', sc.cuts.map(c => `${c.n}컷: ${clip(c.prompt || '-', 90)}`).join('\n'));
    show(monClose, false);
    A.artist.carry(thumbsNode(thumbs));
    talk([[A.artist, '컷 완성! 핵심 컷으로 <b>모션</b> 만들러 가요.', 0, 1800], [A.reporter, '모션까지? 멋지다', 700, 1500]]);
    offDuty('reporter', 'pd');
    camera([0.78, 0.78], 1.35);
    await A.artist.walkTo('video', { status: '모션 부스로 이동', face: 'right' });
    A.artist.status('모션 생성 중', true);
    const key = sc.cuts.find(c => c.effect_text) || sc.cuts[sc.cuts.length - 1];
    motionClose.innerHTML = `<div class="mv"><div style="background-image:url(${panelThumbURL(key)})"></div><span class="rec">● 모션</span></div><div style="font-size:1.05cqw;margin-top:.4cqw;color:#ccc">${key.n}컷 · 패럴랙스 줌 6초 (모션 정보 생성)</div>`;
    show(motionClose); await wait(3200);
    cardAdd(4, '모션', `${key.n}컷 기준 6초 패럴랙스 줌(카메라: 확대 + 좌상단 이동)`);
    logit('artist', `${key.n}컷 모션 생성`, '모션 정보');
    show(motionClose, false); A.artist.carry(thumbsNode(thumbs));
    camera([0.36, 0.72], 1.25);
    // everyone converges on the review table
    duty('chief', 'artist', 'reporter', 'pd');
    later(300, () => A.reporter.walkTo('reviewWatchR', { status: '검수 참관', face: 'left' }));
    later(900, () => A.pd.walkTo('reviewWatchP', { status: '검수 참관', face: 'left' }));
    A.chief.walkTo('reviewChief', { status: '검수 테이블', face: 'left' });
    await A.artist.walkTo('reviewArtist', { status: '국장에게 보고하러', face: 'left' });
    await handoff(A.artist, A.chief, thumbsNode(thumbs), `국장님, <b>${sc.cuts.length}컷</b>과 모션이에요. 카드 v4도요.`, '수고했어. 원문 펼쳐 보자'); cardHold('chief');
    A.reporter.faceTo(A.chief); A.pd.faceTo(A.chief);

    // 6 · 검수 · 보도
    setStep(5); A.chief.think('원문과 대조 중');
    reviewClose.innerHTML = `<h6>국장 검수 — 원문 대조</h6><div id="rvRows"></div>`; show(reviewClose);
    let rv = live ? await askJSON('chief', '원문 대조 검수', PR.review(a, b, sc.cuts), 'default') : null;
    if (!Array.isArray(rv)) { await wait(1400); rv = useDemo(RUN, 'review'); }
    A.chief.hush(); A.chief.status('검수 중', true);
    const rvRows = $('#rvRows');
    for (const r of rv) {
      const it = el('div', 'li'); it.innerHTML = `<span class="v ${r.verdict === '통과' ? 'pass' : 'fix'}">${esc(r.verdict)}</span><span><b>${r.n}컷 · ${esc(r.check || '')}</b><br>${esc(r.issue || '')}${r.fixed ? `<br><span style="color:#2e7d4f">→ ${esc(r.fixed.replace(/\n/g, ' '))}</span>` : ''}</span>`; rvRows.append(it); await wait(60); it.classList.add('in');
      if (r.verdict === '통과') { A.chief.sayNow(`${r.n}컷 <b>통과</b>`, 1100); later(300, () => (r.n % 2 ? A.reporter : A.pd).say(pick(['좋아!', '통과!', '휴~']), 900)); }
      else { A.chief.sayNow(`${r.n}컷 <b>수정</b> — ${esc(clip(r.issue || '', 20))}`, 1700); later(700, () => A.artist.say('바로 고칠게요!', 1300)); }
      await wait(1050);
    }
    const fixes = rv.filter(r => r.verdict !== '통과');
    applyFixes(sc.cuts, rv);
    cardAdd(5, '검수 결과', rv.map(r => `${r.n}컷 ${r.verdict}${r.issue ? ' — ' + r.issue : ''}`).join('\n'));
    if (fixes.length) {
      A.chief.carry((() => { const m = el('div', 'memo', `수정 ${fixes.length}건`); return m; })());
      await talk([[A.chief, `<b>${fixes.length}건</b> 수정 반영해. 사실은 원문 그대로!`, 0, 2000], [A.artist, '반영 완료했어요', 1300, 1500]]);
      logit('chief', `수정 요청 ${fixes.length}건 → 제작부`);
    } else await A.chief.say('전부 <b>통과</b>. 사실이 원문과 맞아.', 1800);
    // human review loop
    for (;;) {
      A.chief.sayNow('마지막은 <b>독자</b> 확인이야', 2400);
      const rr = await decide({ title: '보도 전에 확인해 주세요', text: '국장 검수가 끝났어요. 바로 보도하거나, 고칠 점을 적으면 제작부가 다시 만들어요.', textarea: { placeholder: '예) 2컷 대사를 더 담담하게 바꿔 줘 / 4컷에 출처를 더 크게' }, submit: [{ label: '보도하기', value: 'go' }, { label: '의견 반영해서 다시 만들기', value: 'rev', ghost: true }] });
      if (rr.value === 'go' || !rr.text) break;
      logit('reader', `검수 의견 — ${rr.text}`); cardAdd(5, '독자 의견', rr.text, { hitl: true });
      A.chief.sayNow('독자 의견이야. 반영해 줘!', 1600); later(500, () => A.reporter.say('사실은 그대로 두고요!', 1500)); A.artist.think('다시 그리는 중');
      const nc = live ? await askJSON('artist', '독자 의견 반영', PR.revise(sc.cuts, rr.text), 'quick') : null;
      if (Array.isArray(nc) && nc.length) sc.cuts = nc.map((c, i) => ({ ...sc.cuts[i], ...c, n: i + 1 }));
      else { await wait(1500); toast(live ? '수정본을 받지 못해 기존 컷을 유지해요.' : '데모에서는 의견이 기록만 되고 컷은 그대로예요.'); }
      A.artist.hush(); await A.artist.say('수정했어요!', 1200);
    }
    show(reviewClose, false); A.chief.carry(null);
    cardAdd(6, '보도', `웹툰체 ${sc.cuts.length}컷 · ${new Date().toLocaleString('ko-KR')}`); cardHold(null);
    camera(null);
    await talk([[A.chief, '좋아, <b>보도</b>해!', 0, 1700], [A.reporter, '보도!', 350, 1300], [A.pd, '송출 준비 완료', 600, 1400], [A.artist, '수고하셨습니다!', 850, 1400]]);
    RUN.finished = new Date().toISOString(); RUN.cardFields = CARD.fields.map(f => ({ v: f.v, label: f.label, value: typeof f.value === 'string' ? f.value : f.value?.text, hitl: !!f.hitl }));
    saveRun(); openReader();
  } catch (e) { console.error(e); toast('진행 중 오류가 났어요: ' + (e?.message || e?.code || e)); }
  finally { busy = false; $('#go').disabled = $('#demo').disabled = false; updMode(); setStep(6); duty(); }
}
function applyFixes(cuts, rv) {
  for (const r of rv) {
    if (r.verdict === '통과' || !r.fixed) continue; const c = cuts.find(x => x.n === r.n); if (!c) continue;
    c.fixNote = `국장 검수에서 수정 — ${r.issue || ''}`;
    if ((r.field || 'caption') === 'caption' && c.caption) c.caption = r.fixed;
    else { const m = /bubble(\d)/.exec(r.field || ''); const bi = m ? +m[1] : 0; if (c.bubbles?.[bi]) c.bubbles[bi].text = r.fixed; else if (c.caption) c.caption = r.fixed; }
  }
}
