// ───────────── webtoon reader ─────────────
function openReader() {
  const r = RUN; if (!r?.script) return;
  const strip = $('#strip'); strip.innerHTML = ''; strip.classList.remove('podstrip'); $('.rd').classList.remove('wide');
  const tc = el('div', 'titlecard');
  tc.innerHTML = `<small>나만의 AI 편집국 · 웹툰체 · ${esc(r.script.narrative?.type || '')}</small>
    <h2>${esc(clip(r.A.title, 60))}</h2>
    <div class="chainline"><span>기사 A · ${esc(r.A.outlet)}${r.A.section ? ' ' + esc(r.A.section) : ''}</span>→<span class="r">레마 “${esc(r.analysis.chosen.rheme)}”</span>${r.B ? `→<span>기사 B · ${esc(r.B.outlet)}${r.B.section ? ' ' + esc(r.B.section) : ''}</span>` : ''}</div>`;
  strip.append(tc);
  strip.insertAdjacentHTML('beforeend', `<div class="tapguide"><i>i</i>말풍선·글자·기호·효과선을 탭하면, 왜 그렇게 그렸는지와 근거가 된 기사 문장이 나와요.</div>`);
  r.script.cuts.forEach((c, i) => strip.append(renderPanel(c, i)));
  $('#whySheet').hidden = true;
  setTimeout(() => { strip.querySelectorAll('[data-f]').forEach(x => x.classList.add('hint')); setTimeout(() => strip.querySelectorAll('.hint').forEach(x => x.classList.remove('hint')), 1600); }, 500);
  strip.insertAdjacentHTML('beforeend', `<p style="color:#8a7b68;font-size:12px;padding:0 22px 10px;margin:0">AI가 기사 원문의 사실을 재구성한 콘텐츠예요. 정확한 내용은 원문에서 확인해 주세요.</p>`);
  // why: per-cut grounds
  $('#rdWhy').innerHTML = `<h4>왜 이렇게 그렸나 — 기사 내용 → 표현·서사 선택</h4>
    <p style="margin:0 0 8px;color:var(--ink-2);font-size:13px"><b>서사: ${esc(r.script.narrative?.type || '')}</b> — ${esc(r.script.narrative?.why || '')}</p>
    <table><tr><th>컷</th><th>근거가 된 기사 내용</th><th>고른 표현</th></tr>${r.script.cuts.map(c => `<tr><td>${c.n} · ${esc(SRC_LABEL[c.source] || c.source || '')}</td><td>${esc(c.fact || '')}</td><td>${esc([c.caption ? '사각형' : '', ...(c.bubbles || []).map(b => ({ round: '둥근형', rect: '사각형', burst: '방사형', wave: '특수형' }[b.type] || b.type) + (b.invented ? '(재구성)' : '')), c.effect_text ? '효과글자 ' + c.effect_text : '', c.pictogram ? '픽토그램 ' + ({ won: '₩', sweat: '땀방울', question: '물음표', exclaim: '느낌표' }[c.pictogram] || c.pictogram) : '', c.lines && c.lines !== 'none' ? (c.lines === 'hatch' ? '사선 빗금' : '방사형 효과선') : ''].filter(Boolean).join(' · '))}</td></tr>`).join('')}</table>
    ${(r.script.expressive || []).length ? `<p style="margin:10px 0 0;color:var(--ink-2);font-size:12.5px">${r.script.expressive.map(x => `<b>${esc(x.feature)}</b> — ${esc(x.why)}`).join('<br>')}</p>` : ''}`;
  $('#rdSrc').innerHTML = `<h4>원문 기사</h4><p style="margin:0;font-size:13px;line-height:1.8">A · ${r.A.url ? `<a href="${esc(r.A.url)}" target="_blank" rel="noopener">${esc(r.A.title)}</a>` : esc(r.A.title)} (${esc(r.A.outlet)})${r.B ? `<br>B · ${r.B.url ? `<a href="${esc(r.B.url)}" target="_blank" rel="noopener">${esc(r.B.title)}</a>` : esc(r.B.title)} (${esc(r.B.outlet)})` : ''}<br><span style="color:var(--ink-3)">연결: ${esc(r.bAnalysis?.link || '')}</span></p>`;
  renderFeedback();
  $('#rdNext').hidden = !r.B?.url;
  $('#reader').classList.add('show'); $('#reader').scrollTop = 0;
}
$('#rdClose').addEventListener('click', () => $('#reader').classList.remove('show'));

// ───────────── tap-to-explain ─────────────
const FEAT = {
  caption: c => ({ name: '사각형 말풍선', sub: LIB.bubbles.rect, kind: 'exp' }),
  bubble: (c, i) => { const b = c.bubbles?.[i] || {}; return { name: (LIB.bubbles[b.type] || LIB.bubbles.round).split(' · ')[0] + ' 말풍선', sub: (LIB.bubbles[b.type] || '') + (b.invented ? ' · 재구성 대사' : ''), kind: 'exp' }; },
  fx: c => ({ name: `개념 효과글자 ‘${c.effect_text}’`, sub: '확인된 수치·개념을 글자 형상으로', kind: 'exp' }),
  pic: c => ({ name: '픽토그램 ' + ({ won: '₩', sweat: '땀방울', question: '물음표', exclaim: '느낌표' }[c.pictogram] || ''), sub: LIB.pictogram[c.pictogram] || '', kind: 'exp' }),
  lines: c => ({ name: c.lines === 'radial' ? '방사형 효과선' : '사선 빗금', sub: LIB.lines[c.lines] || '', kind: 'exp' }),
  cut: c => ({ name: `${c.n}컷의 역할`, sub: `서사: ${RUN.script.narrative?.type || ''}`, kind: 'nar' })
};
const DEFAULT_WHY = {
  caption: '인물의 말이 아니라 사실을 설명하는 문장이라 사각형(내레이션)으로 담았다.',
  bubble: '기사 속 반응을 인물의 목소리로 옮겼다.',
  fx: '기사에서 확인된 수치·개념을 크게 보여 주려고 효과글자로 만들었다.',
  pic: '반복되는 개념을 기호 하나로 요약했다.',
  lines: '이 컷의 감정·변화에 시선을 모으려고 효과선을 넣었다.'
};
function articleOf(c) { return c.source === 'B' && RUN.B ? RUN.B : RUN.A; }
function findSentence(body, ev, fact) {
  const sents = String(body || '').replace(/\[요약·재서술\]\s*/, '').split(/(?<=[.!?。…])\s+|\n+/).map(x => x.trim()).filter(x => x.length > 6);
  if (!sents.length) return null;
  let best = null, score = -1;
  const grams = t => { const g = new Set(); const z = String(t || '').replace(/\s+/g, ''); for (let i = 0; i < z.length - 1; i++) g.add(z.slice(i, i + 2)); return g; };
  const fg = grams(fact);
  for (const st of sents) {
    let sc = ev && st.includes(ev) ? 100 : 0; const sg = grams(st); fg.forEach(g => { if (sg.has(g)) sc++; });
    if (sc > score) { score = sc; best = st; }
  }
  return best;
}
function openWhy(panel, f, i) {
  const n = +panel.dataset.n; const c = RUN.script.cuts.find(x => x.n === n); if (!c) return;
  const meta = FEAT[f] ? FEAT[f](c, i) : FEAT.cut(c);
  const key = f === 'bubble' ? 'bubbles' : f;
  let why = f === 'cut' ? (c.role || c.why?.role || '') : (key === 'bubbles' ? c.why?.bubbles?.[i] : c.why?.[key]);
  if (!why) { const ex = (RUN.script.expressive || []).find(x => meta.name && x.feature && (x.feature.includes(meta.name.split(' ')[0]) || meta.name.includes(x.feature.split(' ')[0]))); why = ex?.why || DEFAULT_WHY[f] || ''; }
  const art = articleOf(c); const live = RUN.mode === 'live';
  const sent = findSentence(art?.body, c.evidence, c.fact);
  const mark = (t) => { let h = esc(clip(t, 140)); if (c.evidence && t.includes(c.evidence)) h = h.split(esc(c.evidence)).join(`<mark>${esc(c.evidence)}</mark>`); return h; };
  const narBlk = `<div class="blk"><b class="l">서사적 특성 · ${esc(RUN.script.narrative?.type || '')}</b>${esc(c.role || '')}${f === 'cut' ? `<div class="sub" style="margin-top:4px">${esc(RUN.script.narrative?.why || '')}</div>` : ''}</div>`;
  $('#wsBody').innerHTML = `<span class="kind ${meta.kind === 'nar' ? 'nar' : ''}">${meta.kind === 'nar' ? '서사적 특성' : '표현적 특성'}</span><span class="sub">${n}컷 · ${esc(SRC_LABEL[c.source] || c.source || '')}</span>
    <h5>${esc(meta.name)}</h5><div class="sub">${esc(meta.sub || '')}</div>
    ${f !== 'cut' ? `<div class="blk"><b class="l">왜 이렇게 그렸나</b>${esc(why)}</div>` : ''}
    <div class="blk"><b class="l">근거가 된 기사 ${live ? '원문' : '내용(요약)'}</b>
      ${sent ? `<blockquote>${mark(sent)}</blockquote>` : ''}${c.fact ? `<div class="sub" style="margin-top:6px">편집국 메모: ${esc(c.fact)}</div>` : ''}
      <div class="src"><span>${esc(art?.outlet || '')}${art?.section ? ' · ' + esc(art.section) : ''}${art?.date ? ' · ' + esc(art.date) : ''}</span>${art?.url ? `<a href="${esc(art.url)}" target="_blank" rel="noopener">원문 열기 ↗</a>` : ''}</div></div>
    ${f === 'cut' || meta.kind === 'nar' ? narBlk : `<div class="blk"><b class="l">이 컷이 서사에서 맡은 역할</b>${esc(c.role || '')}</div>`}
    ${c.fixNote && (f === 'caption' || f === 'bubble') ? `<div class="fix">${esc(c.fixNote)}</div>` : ''}`;
  $('#whySheet').hidden = false;
  document.querySelectorAll('#strip .on').forEach(x => x.classList.remove('on'));
  const target = f === 'cut' ? panel.querySelector('.wt-src') : (f === 'bubble' ? panel.querySelector(`[data-f="bubble"][data-i="${i}"]`) : panel.querySelector(`[data-f="${f}"]`));
  target?.classList.add('on');
  logit('reader', `웹툰 ${n}컷 «${meta.name}» 이유 확인`);
  (RUN.taps = RUN.taps || []).push({ n, f, i: i ?? null, t: new Date().toISOString() });
}
$('#strip').addEventListener('click', e => {
  const t = e.target.closest('[data-f]'); const panel = e.target.closest('.wt-panel'); if (!panel) return;
  if (t) openWhy(panel, t.dataset.f, t.dataset.i != null ? +t.dataset.i : undefined); else openWhy(panel, 'cut');
});
$('#wsClose').addEventListener('click', () => { $('#whySheet').hidden = true; document.querySelectorAll('#strip .on').forEach(x => x.classList.remove('on')); });
$('#rdClose').addEventListener('click', () => { $('#whySheet').hidden = true; });
$('#rdNext').addEventListener('click', () => { $('#reader').classList.remove('show'); $('#url').value = RUN?.B?.url || ''; $('#url').focus(); toast('기사 B가 새 관심 기사로 들어갔어요. 「편집국에 보내기」를 누르면 B의 레마로 다음 기사를 찾아요.'); });

// ───────────── interview feedback (db) ─────────────
const FBQ = [['understand', '기사 A와 B가 왜 이어지는지 이해됐다'], ['interest', 'B 기사를 원문으로 더 읽어 보고 싶다'], ['trust', '웹툰·팟캐스트의 내용을 믿을 수 있다'], ['process', '편집국이 일하는 과정을 보는 게 도움이 됐다'], ['again', '다른 관심 기사로도 써 보고 싶다']];
function renderFeedback() {
  const box = $('#rdFb'); const ans = {};
  box.innerHTML = `<h4>인터뷰 응답 (1 전혀 아니다 · 5 매우 그렇다)</h4>${FBQ.map(([k, q]) => `<div class="likert"><span>${esc(q)}</span><div class="sc" data-k="${k}">${[1, 2, 3, 4, 5].map(n => `<button type="button" data-n="${n}" aria-label="${n}점">${n}</button>`).join('')}</div></div>`).join('')}
   <input type="text" id="fbWho" placeholder="인터뷰이 코드 (예: P03)" style="margin:6px 0">
   <textarea id="fbNote" placeholder="자유 의견 · 관찰 메모 (어느 장면에서 멈췄는지, 무엇을 물었는지)"></textarea>
   <div class="inrow" style="margin-top:8px"><button class="btn" id="fbSave" type="button">응답 저장</button><span id="fbMsg" class="hint" style="margin:0"></span></div>`;
  box.querySelectorAll('.sc').forEach(sc => sc.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; ans[sc.dataset.k] = +b.dataset.n; sc.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }));
  $('#fbSave').addEventListener('click', async () => {
    const doc = { runId: RUN.id || null, mode: RUN.mode, who: $('#fbWho').value.trim(), note: $('#fbNote').value.trim(), answers: ans, articleA: RUN.A.title, articleB: RUN.B?.title || null, rheme: RUN.analysis.chosen.rheme, taps: (RUN.taps || []).length, savedAt: new Date().toISOString() };
    if (!DB) { $('#fbMsg').textContent = '이 화면에서는 저장소를 쓸 수 없어요. 「실험 기록 저장」으로 내려받아 주세요.'; RUN.feedback = doc; return; }
    try { await DB.collection('feedback').add(doc); $('#fbMsg').textContent = '저장했어요. 다음 인터뷰이를 위해 새 기사로 시작할 수 있어요.'; $('#fbSave').disabled = true; }
    catch (e) { $('#fbMsg').textContent = `저장 실패 (${e?.code || 'error'}) — 「실험 기록 저장」으로 내려받아 주세요.`; RUN.feedback = doc; }
  });
}
async function saveRun() {
  RUN.id = 'run_' + Date.now().toString(36);
  if (!DB) return;
  try {
    await DB.doc('runs/' + RUN.id).set({ mode: RUN.mode, started: RUN.started, finished: RUN.finished, articleA: { title: RUN.A.title, outlet: RUN.A.outlet, url: RUN.A.url || '' }, articleB: RUN.B ? { title: RUN.B.title, outlet: RUN.B.outlet, url: RUN.B.url || '' } : null,
      rheme: RUN.analysis.chosen.rheme, media: RUN.media || 'webtoon', narrative: (RUN.script || RUN.pod)?.narrative?.type || '', cuts: (RUN.script?.cuts || []).map(({ img, ratio, ...c }) => c), lines: (RUN.pod?.lines || []).map(({ st, who, kind, text, art, ev }) => ({ st, who, kind, text, art, ev })), voice: RUN.pod ? { engine: RUN.pod.engine, spec: RUN.pod.spec?.rows, audition: RUN.pod.audition } : null, card: RUN.cardFields, demoParts: [...RUN.demoUsed] });
    logit('chief', '실행 기록을 저장소에 남김', 'db · runs');
  } catch (e) { logit('chief', `실행 기록 저장 실패 (${e?.code || 'error'})`, 'db'); }
}
$('#rdExport').addEventListener('click', async () => {
  const data = JSON.stringify({ ...RUN, demoUsed: [...(RUN.demoUsed || [])], log: RUNLOG }, null, 2);
  const name = `ai-newsroom-${(RUN.id || 'run')}.json`;
  if (DL) { try { await DL.save({ filename: name, data }); return; } catch (e) { if (e?.code === 'declined') return; } }
  try { await navigator.clipboard.writeText(data); toast('파일 저장을 쓸 수 없어 실험 기록(JSON)을 클립보드에 복사했어요.'); } catch { toast('이 화면에서는 저장·복사가 막혀 있어요.'); }
});

// ───────────── start ─────────────
$('#form').addEventListener('submit', e => {
  e.preventDefault(); const u = $('#url').value.trim();
  if (!u) { toast('기사 링크를 넣어 주세요. 먼저 둘러보려면 데모를 눌러 보세요.'); return; }
  if (!SAMPLE) {
    const same = u.replace(/^https?:\/\//, '').replace(/&.*$/, '') === DEMO.A.url.replace(/^https?:\/\//, '');
    toast(same ? '이 링크는 실험 기록이 있어요. 그때의 편집국 작업을 그대로 재생할게요.' : '이 화면에서는 Claude 연결이 없어 실험 기록(서울신문 기사)으로 보여 줄게요.');
    run('demo', u); return;
  }
  run('live', u);
});
$('#demo').addEventListener('click', () => run('demo'));
placeSurfaces(); renderCard(); setStep(-1);
logit('chief', '편집국 문이 열렸어요. 관심 기사를 기다리는 중.');
