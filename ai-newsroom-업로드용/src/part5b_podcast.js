// ───────────── 팟캐스트체 · 제작부 ─────────────
// 흐름: 소리 기호 4 선택 → 서사 5유형 판정 → 게스트(레마→면→학문→렌즈) → 4단계 대본
//      → 목소리 '설계'(규칙 → 설명문) → 오디션(미리듣기 3개를 측정: 음높이·억양 폭·말 속도) → 녹음(대화 + 타임스탬프) → 검수
// 엔진: ElevenLabs(키가 있으면 실제 생성) / 브라우저 음성(키가 없으면 미리듣기). 결과는 같은 플레이어로 재생된다.

const PODLIB = {
  signs: [
    { k: 'voice', name: '말(목소리)', fn: '정보를 직접 전한다. 누가 말하는지가 곧 관점이다' },
    { k: 'sfx', name: '효과음', fn: '장면을 들리게 하거나 구간이 바뀌었음을 알린다' },
    { k: 'music', name: '음악', fn: '분위기를 깔고 감정의 방향을 정한다' },
    { k: 'silence', name: '침묵', fn: '말을 멈춰 생각할 자리를 만든다' }],
  narratives: { '질문·해설형': '진행자가 묻고 전문가가 풀어 준다', '숫자·풀이형': '수치 하나를 쪼개 의미를 푼다', '관점·대담형': '서로 다른 관점이 마주 앉는다', '추적·내러티브형': '사건을 시간 순으로 따라간다', '현장·증언형': '현장의 소리와 당사자 목소리로 전한다' },
  fields: [[/정치|행정/, '행정학', '제도와 책임은 어떻게 바뀌어야 하나?'], [/금융/, '금융학', '개인과 가계의 돈 흐름은 어떻게 달라지나?'], [/경제|산업|부동산/, '경제학', '누가 비용을 치르고, 행동은 어떻게 바뀌나?'], [/교육/, '교육학', '배움의 기회는 누구에게 어떻게 열려 있나?'], [/IT|과학|기술/, '정보과학', '기술은 무엇을 가능하게 하고, 무엇을 막아야 하나?'], [/국제|외교/, '국제관계학', '나라 사이의 힘과 이해는 어떻게 움직이나?'], [/문화|연예|스포츠/, '문화연구', '이 이야기는 우리에게 어떤 의미로 읽히나?'], [/사회|노동|복지/, '사회학', '이 일은 어떤 사람들의 경험을 바꾸나?']],
  pace: { '질문·해설형': 0.85, '숫자·풀이형': 0.8, '관점·대담형': 0.95, '추적·내러티브형': 0.9, '현장·증언형': 1 },   // 게스트 말 속도 = 진행자 × 이 값
  stages: ['사실', '핵심', '연결', '요약'],
  cuePrompt: 'Two soft wooden mallet notes, short neutral podcast section transition cue, dry studio, no melody, no reverb tail'
};
function fieldOf(section) { for (const [re, f, lens] of PODLIB.fields) if (re.test(section || '')) return { field: f, lens }; return { field: '사회학', lens: '이 일은 어떤 사람들의 경험을 바꾸나?' }; }

const DEMO_POD = {
  signs: [
    { k: 'voice', use: '씀 · 2인 대화', on: true, why: 'A는 사건, B는 수치다. 둘을 잇는 해석이 필요해서 묻는 사람(진행자)과 풀어 주는 사람(게스트)의 대화로 만든다.' },
    { k: 'sfx', use: '최소 · 구간 전환 신호만', on: true, why: '시험장 소리 같은 장면 효과음은 쓰지 않는다. 기사도 수법을 공개하지 않아, 장면을 들려주면 추측이 된다.' },
    { k: 'music', use: '쓰지 않음', on: false, why: '‘허탈감’을 음악으로 키우면 감정이 사실보다 앞선다. 귀를 해설에 모은다.' },
    { k: 'silence', use: '씀 · 질문 뒤 1.5초', on: true, why: '진행자가 물은 뒤 비워 두는 시간이, 답을 듣기 전에 원문에서 먼저 찾아보는 자리가 된다.' }],
  narrative: { type: '질문·해설형', why: 'A의 레마(정직하게 준비한 수험생)가 B의 수치(학원비 20%)로 이어지려면 “그게 왜 연결되나”를 묻고 풀어야 한다.' },
  verdicts: [
    { type: '질문·해설형', v: '선택', why: '사건(A)과 수치(B) 사이를 질문으로 잇는다' },
    { type: '숫자·풀이형', v: '조건부', why: 'B의 20%·2배는 풀이가 필요하지만 A에는 수치가 없다' },
    { type: '관점·대담형', v: '대안', why: '찬반이 갈리는 쟁점이 아니라 대담의 축이 약하다' },
    { type: '추적·내러티브형', v: '대안', why: '경과가 짧고 수법이 비공개라 따라갈 이야기가 적다' },
    { type: '현장·증언형', v: '부적합', why: '당사자 증언을 재연하면 실존 인물의 말을 만드는 셈이다' }],
  tone: { weight: '무거움', why: '부정행위와 수험생의 허탈감, 곧 피해를 다루는 기사다' },
  guest: { reason: '레마 ‘정직하게 준비한 수험생’이 금융면 기사 B로 이어졌고, B의 핵심은 준비하는 사람이 내는 돈이다.' },
  episode: { title: '정직하게 준비하는 값은 누가 치르나' },
  lines: [
    { st: '사실', who: 'host', kind: 'talk', tag: '[warmly]', text: '나만의 AI 편집국 팟캐스트입니다. 오늘은 서울신문 사회면 기사 한 편에서 출발할게요.' },
    { st: '사실', who: 'host', kind: 'fact', art: 'A', ev: '경찰에 자수했다', say: '자수했대요', text: '올해 세무사 시험 수석 합격자가, 생성형 AI로 부정행위를 했다고 인정하고 경찰에 자수했대요.' },
    { st: '핵심', who: 'host', kind: 'fact', art: 'A', ev: '실망과 허탈감', say: '허탈감', text: '그런데 제 눈에 밟힌 건 사과의 한 대목이었어요. 성실하게 준비해 온 수험생들에게 허탈감을 줬다는 말이요.' },
    { st: '핵심', who: 'host', kind: 'ask', tag: '[curious]', art: 'A', ev: '실망과 허탈감', say: '진짜 문제', text: '근데… 진짜 문제는 뭘까요?' },
    { st: '연결', who: 'guest', kind: 'talk', tag: '[calm]', text: '안녕하세요. 저는 AI가 연기하는 가상의 금융학 교수입니다. 제가 오늘 불려 온 건, 정직하게 준비하는 데에도 돈이 들기 때문이에요.' },
    { st: '연결', who: 'guest', kind: 'ans', art: 'B', ev: '5년 새 20% 올라', say: '20%', text: '뉴시스 금융면 기사를 보면, 자격증과 직업훈련 학원비가 5년 새 20% 올랐어요. 교육 분야 가운데 가장 큰 폭입니다.' },
    { st: '연결', who: 'host', kind: 'ask', tag: '[curious]', art: 'B', ev: '5년 새 20% 올라', say: '누구', text: '20%면… 누구한테 제일 크게 와닿아요?' },
    { st: '연결', who: 'guest', kind: 'ans', art: 'B', ev: '두 배', say: '두 배', text: '20대예요. 20대의 교육 결제단가 증가율이 다른 세대 평균의 두 배였거든요.' },
    { st: '요약', who: 'host', kind: 'ask', tag: '[thoughtful]', art: 'B', ev: '일상이 되면서', say: '달라지는', text: '그럼 시험을 준비하는 사람한테는, 뭐가 달라지는 거죠?' },
    { st: '요약', who: 'guest', kind: 'ans', art: 'B', ev: '교육비 부담이 커지고', say: '부담', text: '취업 준비가 일상이 되면서 교육비 부담이 커지고 있다는 게 기사의 분석이에요. 금융학에서는 이렇게 준비에 드는 돈과 시간을 미래를 위한 투자 비용으로 봐요.' },
    { st: '요약', who: 'guest', kind: 'ans', art: 'A', ev: '공정성에 대한 신뢰', say: '신뢰', text: '그래서 시험 부정행위는, 그 비용을 치르며 준비한 사람들의 신뢰를 흔드는 일이 되는 거죠.' },
    { st: '요약', who: 'host', kind: 'talk', tag: '[warmly]', text: '오늘의 물음은 이거였어요. 정직하게 준비하는 값은, 누가 치르나. 원문은 화면 왼쪽에서 바로 확인해 보세요.' }],
  next: { rheme: '20대 교육 결제단가 증가율이 다른 세대의 2배', section: '사회', why: '세대 간 격차라는 새 질문이 생긴다' },
  review: [
    { n: 2, verdict: '통과', check: '사실 대조', issue: 'A 리드(인정·자수)와 일치' },
    { n: 5, verdict: '통과', check: '가상 인물 고지', issue: '첫 마디에 AI가 연기하는 가상 교수임을 밝힘' },
    { n: 6, verdict: '통과', check: '사실 대조', issue: 'B 수치(5년 새 20%, 최대 폭)와 일치' },
    { n: 8, verdict: '통과', check: '사실 대조', issue: '20대 증가율 = 다른 세대 평균의 2배, 일치' },
    { n: 10, verdict: '수정', check: '해석 수위', issue: '‘투자 비용’은 기사에 없는 해석 → 학문의 일반적 관점임을 밝힐 것', fixed: '취업 준비가 일상이 되면서 교육비 부담이 커지고 있다는 게 기사의 분석이에요. 금융학에서는 일반적으로, 이렇게 준비에 드는 돈과 시간을 미래를 위한 투자 비용으로 봐요.' },
    { n: 11, verdict: '통과', check: '연결 근거', issue: 'A의 ‘공정성 신뢰 훼손’ 사과와 이어짐' }]
};

// ───────────── prompts (라이브 모드) ─────────────
Object.assign(PR, {
  podcast: (a, b, an, ba, g) => `너는 제작부 작가이자 팟캐스트 PD다. 기사 A에서 레마를 거쳐 기사 B로 이어지는 2인 팟캐스트 1화를 설계한다.
1) 소리 기호 4개(${PODLIB.signs.map(s => s.name).join(', ')}) 각각 이 기사에서 쓸지, 어떻게 쓸지(use, 15자 이내), 기사 내용 근거(why, 60자 이내)를 정한다. 장면 효과음은 기사에 없는 장면을 지어낼 위험이 있으면 쓰지 않는다. 감정을 과장할 위험이 있으면 음악은 쓰지 않는다. 침묵은 질문 뒤 '생각 틈'(초 단위)으로 쓴다.
2) 서사 5유형(${Object.keys(PODLIB.narratives).join(', ')}) 각각을 선택/조건부/대안/부적합 중 하나로 판정하고 이유(35자)를 쓴다. 선택은 하나.
3) 기사의 무게(tone.weight: 무거움/보통/가벼움)와 근거.
4) 게스트는 ${g.field} 교수(AI가 연기하는 가상 인물). 질문 렌즈: "${g.lens}". 게스트를 모신 이유(reason, 60자)는 레마와 B의 연결로 쓴다.
5) 대본 10~13줄, 4단계(사실→핵심→연결→요약). who는 host(진행자=제작부) 또는 guest. kind는 talk/fact/ask/ans. ask는 진행자의 질문(짧게), 바로 뒤에 guest의 ans가 온다. 게스트의 첫 줄에 "AI가 연기하는 가상의 ${g.field} 교수"임을 밝힌다. 실존 인물 이름 금지, 기사에 없는 사실 금지. 학문의 일반적 관점을 말할 때는 "일반적으로"를 붙인다.
   fact/ask/ans 줄에는 art("A"|"B"), ev(그 원문 본문에 글자 그대로 있는 4~12자 구절), say(그 줄 text 안에 글자 그대로 있는 2~8자 구절, 이 구절을 말하는 순간 원문 ev가 켜진다)를 넣는다. tag는 ElevenLabs v3 오디오 태그 하나([curious],[thoughtful],[calm],[warmly] 중) 또는 빈 문자열. 각 text는 70자 이내.
${PROMPT_RULES}
JSON으로만: {"signs":[{"k":"voice|sfx|music|silence","use":"","on":true,"why":""}],"narrative":{"type":"","why":""},"verdicts":[{"type":"","v":"선택|조건부|대안|부적합","why":""}],"tone":{"weight":"","why":""},"guest":{"reason":""},"episode":{"title":"20자 이내"},"lines":[{"st":"사실|핵심|연결|요약","who":"host|guest","kind":"","tag":"","art":"","ev":"","say":"","text":""}],"next":{"rheme":"B의 레마","section":"다음 기사가 이어질 면","why":"30자"}}
기사 A(${a.outlet}, ${a.section || ''}): ${a.title}
A 본문: ${clip(a.body, 2200)}
고른 레마: ${an.chosen.rheme} — ${an.chosen.why}
${b ? `기사 B(${b.outlet}, ${b.section || ''}): ${b.title}\nB 본문: ${clip(b.body, 2200)}\n연결: ${ba.link}` : '기사 B 없음'}`,
  podReview: (a, b, lines) => `너는 편집국 국장이다. 팟캐스트 대본을 원문과 대조해 검수한다. 기준: 사실 대조(수치·날짜), 가상 인물 고지, 기사에 없는 해석의 표시(“일반적으로”), 연결 근거, 표현 수위.
문제 있는 줄만 "수정"과 fixed(고친 전체 문장), 핵심 줄 몇 개는 "통과"로. JSON 배열로만: [{"n":줄번호(1부터),"verdict":"통과|수정","check":"","issue":"35자 이내","fixed":null}]
기사 A: ${a.title}\nA 내용: ${clip(a.body, 2200)}
${b ? `기사 B: ${b.title}\nB 내용: ${clip(b.body, 2200)}` : ''}
대본: ${JSON.stringify(lines.map((l, i) => ({ n: i + 1, who: l.who, text: l.text })))}`,
  podRevise: (lines, comment) => `너는 제작부 작가다. 독자 의견을 반영해 팟캐스트 대본을 고친다. 사실은 바꾸지 말고 말투·순서·길이만 바꾼다. 같은 구조(st, who, kind, tag, art, ev, say, text)의 lines 배열을 JSON으로만 답하라. say는 text 안에 그대로 있어야 한다.
독자 의견: ${comment}
현재 대본: ${JSON.stringify(lines.map(({ st, who, kind, tag, art, ev, say, text }) => ({ st, who, kind, tag, art, ev, say, text })))}`
});

// ───────────── ElevenLabs ─────────────
const XI = {
  base: 'https://api.elevenlabs.io',
  get key() { try { return localStorage.getItem('ai_newsroom_xi') || ''; } catch { return ''; } },
  set key(k) { try { k ? localStorage.setItem('ai_newsroom_xi', k) : localStorage.removeItem('ai_newsroom_xi'); } catch { } },
  mem: {},
  get(k) { try { return JSON.parse(localStorage.getItem('ai_newsroom_' + k) || 'null'); } catch { return this.mem[k] || null; } },
  put(k, v) { this.mem[k] = v; try { localStorage.setItem('ai_newsroom_' + k, JSON.stringify(v)); } catch { } },
  async req(path, { method = 'GET', body, raw = false } = {}) {
    const r = await fetch(this.base + path, { method, headers: { 'xi-api-key': this.key, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) {
      let msg = ''; try { const j = await r.json(); const d = j.detail ?? j; msg = typeof d === 'string' ? d : (d.message || d.status || JSON.stringify(d)); } catch { }
      const e = new Error(`ElevenLabs ${r.status}${msg ? ' · ' + clip(msg, 120) : ''}`); e.status = r.status; e.detail = msg; throw e;
    }
    return raw ? r.blob() : r.json();
  }
};
const b64url = (b64, type = 'audio/mpeg') => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return URL.createObjectURL(new Blob([u], { type })); };

// ───────────── 목소리 측정 (오디션) — 음높이 F0 · 억양 폭 · 말 속도 ─────────────
async function measureVoice(url, text) {
  const ab = await (await fetch(url)).arrayBuffer();
  const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
  let buf; try { buf = await ac.decodeAudioData(ab); } finally { ac.close?.(); }
  const x = buf.getChannelData(0), sr = buf.sampleRate;
  const step = Math.max(1, Math.round(sr / 16000)), fs = sr / step, n = Math.floor(x.length / step);
  const y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = x[i * step];
  const W = Math.round(fs * 0.04), H = Math.round(fs * 0.015), minL = Math.floor(fs / 420), maxL = Math.ceil(fs / 65);
  const rms = []; for (let s = 0; s + W + maxL < n; s += H) { let e = 0; for (let i = 0; i < W; i++) e += y[s + i] * y[s + i]; rms.push(Math.sqrt(e / W)); }
  const srt = [...rms].sort((a, b) => a - b); const thr = Math.max(srt[Math.floor(srt.length * 0.95)] * 0.1, 2e-3);
  const f0 = []; let active = 0;
  rms.forEach((r, k) => {
    if (r < thr) return; active++;
    const s = k * H; const nsdf = new Float32Array(maxL + 1);
    for (let L = minL; L <= maxL; L++) { let ac2 = 0, m = 0; for (let i = 0; i < W; i++) { const p = y[s + i], q = y[s + i + L]; ac2 += p * q; m += p * p + q * q; } nsdf[L] = m > 0 ? 2 * ac2 / m : 0; }
    let mx = 0; for (let L = minL; L <= maxL; L++) mx = Math.max(mx, nsdf[L]);
    if (mx < 0.6) return;
    for (let L = minL + 1; L < maxL; L++) {   // 첫 번째로 최댓값의 90%를 넘는 봉우리 (옥타브 오류 방지)
      if (nsdf[L] >= 0.9 * mx && nsdf[L] >= nsdf[L - 1] && nsdf[L] >= nsdf[L + 1]) {
        const a = nsdf[L - 1], b2 = nsdf[L], c = nsdf[L + 1]; const d = (a - c) / (2 * (a - 2 * b2 + c) || 1);
        f0.push(fs / (L + (Math.abs(d) < 1 ? d : 0))); break;
      }
    }
  });
  if (f0.length < 8) throw new Error('목소리 구간을 찾지 못함');
  f0.sort((a, b) => a - b);
  const q = p => f0[Math.min(f0.length - 1, Math.floor(f0.length * p))];
  const syl = (String(text || '').match(/[가-힣]/g) || []).length;
  const speechSec = active * H / fs;
  return { f0: Math.round(q(0.5)), rangeSt: +(12 * Math.log2(q(0.9) / q(0.1))).toFixed(1), rate: syl && speechSec ? +(syl / speechSec).toFixed(1) : null, dur: +buf.duration.toFixed(1) };
}
const clamp01 = v => Math.max(0, Math.min(1, v));
function auditionScore(m, host, spec) {
  const d = host?.f0 ? Math.abs(12 * Math.log2(m.f0 / host.f0)) : 0;
  const sC = host?.f0 ? clamp01(d / spec.contrastSt) : 0.5;
  const rMax = host?.rangeSt != null && spec.rangeDelta != null ? host.rangeSt + spec.rangeDelta : spec.rangeMax;
  const sR = clamp01(1 - Math.max(0, m.rangeSt - rMax) / 4);
  const target = host?.rate ? host.rate * spec.rate : null;
  const sP = m.rate && target ? clamp01(1 - Math.abs(m.rate - target) / target) : 0.5;
  return { total: +(0.5 * sC + 0.3 * sR + 0.2 * sP).toFixed(2), d: +d.toFixed(1), sC, sR, sP };
}

// ───────────── 목소리 사양: '어울림' 대신 기능 규칙 ─────────────
const HOST = {
  gender: 'female',
  desc: 'A Korean woman in her late twenties hosting a daily news podcast, speaking natural standard Seoul Korean. Bright, clear mid-high pitch. Curious, friendly questioning tone with lively but controlled intonation. Natural conversational pace. Close-mic studio podcast recording, clean, no background noise, no reverb.',
  sample: '안녕하세요, 나만의 AI 편집국 팟캐스트입니다. 오늘도 기사 한 편에서 출발해서, 그 기사가 새로 알려 준 한 가지를 따라 다른 면의 기사까지 가 볼 거예요. 궁금한 건 제가 바로 물어볼게요. 그럼 오늘 이야기, 시작해 볼까요?'
};
function voiceSpec(pod) {
  const w = pod.tone?.weight || '보통', heavy = w === '무거움', light = w === '가벼움';
  const gender = HOST.gender === 'female' ? 'male' : 'female';
  const rate = PODLIB.pace[pod.narrative?.type] || 0.9, rangeDelta = heavy ? -1 : light ? 3 : 1, rangeMax = 6;
  const field = pod.g.field;
  const desc = `A Korean ${gender === 'male' ? 'man' : 'woman'} in ${gender === 'male' ? 'his' : 'her'} fifties playing a university professor of ${PODLIB_EN[field] || 'social science'} as a podcast guest, speaking natural standard Seoul Korean. ${gender === 'male' ? 'Low, steady' : 'Low-mid, steady'} pitch, clearly lower and darker than a bright young female host. ${heavy ? 'Calm, restrained and serious, with a narrow emotional range, because the topic involves people who were harmed.' : light ? 'Warm and relaxed, with a natural, lively range.' : 'Warm but measured, with a moderate range.'} ${rate < 0.9 ? 'Slow, measured explanatory pace with clear pauses between ideas.' : 'Natural conversational pace.'} Close-mic studio podcast recording, clean, no reverb.`;
  return {
    gender, rate, rangeMax, rangeDelta, contrastSt: 7, desc, field,
    rows: [
      { axis: '구별', value: '진행자와 7반음 이상 다른 음높이', why: '질문(물음 자리)과 답(답 자리)을 귀만으로 갈라 들어야, 왼쪽 원문 표시와 소리가 맞물린다.', kind: '기능' },
      { axis: '억양 폭', value: rangeDelta < 0 ? `진행자보다 ${-rangeDelta}반음 이상 좁게` : `진행자 + ${rangeDelta}반음 이내`, why: `기사의 무게가 ‘${w}’이다 — ${pod.tone?.why || ''}. 목소리가 감정을 키우면 사실보다 연기가 앞선다.`, kind: '기사 근거' },
      { axis: '말 속도', value: rate < 1 ? `진행자보다 ${Math.round((1 - rate) * 100)}% 느리게` : '진행자와 같게', why: `서사가 ‘${pod.narrative?.type}’이라 게스트가 개념을 풀어 주는 구간이 길다. 절대값 대신 진행자 대비로 맞춘다.`, kind: '기능' },
      { axis: '연령감', value: '50대', why: '교수 역할에 대한 관습적 기대. 근거가 약해 점수에는 넣지 않고 설계문에만 쓴다.', kind: '관습(약)' },
      { axis: '고지', value: '첫 마디에 “AI가 연기하는 가상의 교수”', why: '실존 인물로 오해하지 않게 한다.', kind: '안전' }]
  };
}
const PODLIB_EN = { '금융학': 'finance', '경제학': 'economics', '행정학': 'public administration', '교육학': 'education', '정보과학': 'information science', '국제관계학': 'international relations', '문화연구': 'cultural studies', '사회학': 'sociology' };

// ───────────── 목소리 확보: 저장된 게스트 재사용 → 없으면 설계·오디션·저장 ─────────────
async function ensureHostVoice(ui) {
  let h = XI.get('host');
  if (h?.id) return h;
  try { return await designHost(ui); }
  catch (e) {
    if (e.status === 401) throw e;
    ui('진행자 설계 실패 — 기본 목소리 중에서 골라요');
    const j = await XI.req('/v2/voices?category=premade&page_size=100');
    const v = (j.voices || []).find(x => /female/i.test(x.labels?.gender || '') && /young/i.test(x.labels?.age || '')) || (j.voices || []).find(x => /female/i.test(x.labels?.gender || '')) || j.voices?.[0];
    if (!v) throw e;
    let m = null; try { m = await measureVoice(v.preview_url, ''); } catch { }
    h = { id: v.voice_id, m, premade: v.name }; XI.put('host', h); return h;
  }
}
async function designHost(ui) {
  let h;
  ui('진행자 목소리를 처음 설계해요 (한 번만)');
  const pv = await designPreviews(HOST.desc, HOST.sample);
  const ms = []; for (const p of pv) { try { ms.push({ p, m: await measureVoice(p.url, HOST.sample) }); } catch { } }
  const best = ms.sort((a, b) => a.m.rangeSt - b.m.rangeSt)[Math.floor(ms.length / 2)] || { p: pv[0], m: null };   // 진행자는 억양 폭 중간값
  const v = await XI.req('/v1/text-to-voice', { method: 'POST', body: { voice_name: 'AI편집국 진행자', voice_description: HOST.desc, generated_voice_id: best.p.id, labels: { newsroom: 'ai-newsroom', role: 'host' } } });
  h = { id: v.voice_id, m: best.m }; XI.put('host', h); return h;
}
async function designPreviews(desc, text) {
  let j;
  for (const model of ['eleven_ttv_v3', 'eleven_multilingual_ttv_v2']) {
    try { j = await XI.req('/v1/text-to-voice/design?output_format=mp3_44100_128', { method: 'POST', body: { voice_description: desc, model_id: model, text, guidance_scale: 5, loudness: 0.5 } }); break; }
    catch (e) { if (e.status === 401 || model === 'eleven_multilingual_ttv_v2') throw e; }
  }
  return (j.previews || []).map((p, i) => ({ n: i + 1, id: p.generated_voice_id, url: b64url(p.audio_base_64, p.media_type || 'audio/mpeg') }));
}
async function findSavedGuest(field) {
  try {
    const j = await XI.req('/v2/voices?category=generated&page_size=100&search=' + encodeURIComponent('AI편집국'));
    return (j.voices || []).find(v => v.labels?.newsroom === 'ai-newsroom' && v.labels?.role === 'guest' && v.labels?.field === field) || null;
  } catch { return null; }
}

// ───────────── 브라우저 음성 (키 없을 때) ─────────────
const BRV = {
  list() { try { return speechSynthesis.getVoices().filter(v => /^ko/i.test(v.lang)); } catch { return []; } },
  async ready() {
    if (!('speechSynthesis' in window)) return [];
    let v = this.list(); if (v.length) return v;
    await new Promise(r => { const t = setTimeout(r, 1500); speechSynthesis.addEventListener?.('voiceschanged', () => { clearTimeout(t); r(); }, { once: true }); });
    return this.list();
  }
};
function synthCue() {   // 효과음 대체: 나무 말렛 두 음 (WebAudio)
  try {
    const AC = window.AudioContext || window.webkitAudioContext; const ac = POD_AC || (POD_AC = new AC()); const t = ac.currentTime + 0.02;
    [[523.25, 0], [392, 0.16]].forEach(([f, dt]) => { const o = ac.createOscillator(), g = ac.createGain(), o2 = ac.createOscillator(); o.type = 'sine'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f * 3.98; const g2 = ac.createGain(); g2.gain.value = 0.12; o2.connect(g2).connect(g); o.connect(g).connect(ac.destination); g.gain.setValueAtTime(0.0001, t + dt); g.gain.exponentialRampToValueAtTime(0.22, t + dt + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.55); [o, o2].forEach(x => { x.start(t + dt); x.stop(t + dt + 0.6); }); });
  } catch { }
}
let POD_AC = null;

// ───────────── 원문 문장 나누기 · 대본 정리 ─────────────
function sentencesOf(body) { return String(body || '').replace(/\[요약·재서술\]\s*/, '').split(/(?<=[.!?。…])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 4); }
function tidyPod(pod, a, b) {
  const arts = { A: a, B: b };
  pod.lines = (pod.lines || []).filter(l => l && l.text).slice(0, 14).map((l, i) => {
    const L = { ...l, n: i + 1, who: l.who === 'guest' ? 'guest' : 'host', kind: ['talk', 'fact', 'ask', 'ans'].includes(l.kind) ? l.kind : 'talk', tag: /^\[[a-z ]+\]$/i.test(l.tag || '') ? l.tag : '', st: PODLIB.stages.includes(l.st) ? l.st : PODLIB.stages[Math.min(3, Math.floor(i / 3))] };
    const art = arts[L.art];
    if (!art) { L.art = null; L.si = -1; }
    else {
      const ss = sentencesOf(art.body);
      let si = L.ev ? ss.findIndex(s => s.includes(L.ev)) : -1;
      if (si < 0) { const best = findSentence(art.body, L.ev, L.text); si = best ? ss.indexOf(best) : -1; if (L.ev && si >= 0 && !ss[si].includes(L.ev)) L.ev = ''; }
      L.si = si;
    }
    if (L.say && !L.text.includes(L.say)) L.say = '';
    return L;
  });
  return pod;
}

// ───────────── 제작부 진행 (part5 run()에서 호출) ─────────────
async function runPodcast(a, b, an, ba, live) {
  const R = RUN; R.media = 'podcast'; verMedia('podcast');
  const g = fieldOf(b?.section || an.chosen.section);
  // 5 · 제작부: 표현·서사
  setStep(4); duty('artist'); camera([0.74, 0.7], 1.25);
  later(500, () => A.pd.walkTo('pdDesk', { after: '대기', face: 'left' }));
  await A.artist.walkTo('artistDesk', { face: 'right', after: '작업 중' });
  A.artist.think('소리 기호 고르는 중');
  let pod = live ? await askJSON('artist', '소리 기호·서사 선택 + 팟캐스트 대본', PR.podcast(a, b, an, ba || {}, g), 'default') : null;
  if (!pod?.lines?.length || !pod.signs?.length) { await wait(1500); pod = useDemo(R, 'pod'); }
  pod.g = { ...g, section: b?.section || an.chosen.section, reason: pod.guest?.reason || '' };
  tidyPod(pod, a, b); R.pod = pod; A.artist.hush();

  const mon = (title, body) => { monClose.innerHTML = `<div class="pm"><div class="pm-h"><span>${title}</span><span>제작부 · 팟캐스트체</span></div>${body}</div>`; show(monClose); };
  // (1) 소리 기호 4
  mon('소리 기호 4 — 이 기사에서', `<div class="pm-signs">${PODLIB.signs.map(s => { const x = pod.signs.find(y => y.k === s.k) || {}; return `<div class="pm-sign ${x.on === false ? 'off' : ''}"><b>${esc(s.name)}</b><i>${esc(x.use || '-')}</i><span>${esc(x.why || '')}</span></div>`; }).join('')}</div>`);
  monS.innerHTML = `<div class="lbl"><span>SOUND SIGNS</span><span>4</span></div><div class="prompt">${PODLIB.signs.map(s => { const x = pod.signs.find(y => y.k === s.k) || {}; return `${x.on === false ? '✕' : '✓'} ${s.name} · ${x.use || ''}`; }).join('\n')}</div>`;
  const mus = pod.signs.find(s => s.k === 'music'), sil = pod.signs.find(s => s.k === 'silence');
  await talk([[A.artist, mus?.on === false ? '음악은 <b>빼요</b>. 감정이 사실보다 앞서면 안 돼서' : '음악은 아주 낮게만 깔게요', 0, 2400], [A.artist, `대신 <b>침묵</b>을 써요. 질문 뒤에 생각할 틈`, 2500, 2200]]);
  cardAdd(3, '소리 기호 선택', pod.signs.map(s => `· ${(PODLIB.signs.find(x => x.k === s.k) || {}).name} — ${s.use}`).join('\n'));
  // (2) 서사 5유형
  A.artist.think('서사 유형 판정 중'); await wait(900); A.artist.hush();
  const vchip = v => `<em class="v ${v === '선택' ? 'pick' : v === '부적합' ? 'no' : ''}">${esc(v)}</em>`;
  mon('서사 5유형 판정', `<div class="pm-nar">${(pod.verdicts || []).map(x => `<div>${vchip(x.v)}<b>${esc(x.type)}</b><span>${esc(x.why)}</span></div>`).join('')}</div>`);
  A.artist.sayNow(`서사는 <b>${esc(pod.narrative.type)}</b>`, 2000); await wait(2600);
  cardAdd(3, '서사 유형', `${pod.narrative.type}\n근거: ${pod.narrative.why}`);
  // (3) 게스트 선정 체인
  mon('게스트 선정 — 레마가 게스트를 부른다', `<div class="pm-chain"><span>레마<br><b>${esc(clip(an.chosen.rheme, 16))}</b></span>→<span>이어진 면<br><b>${esc(pod.g.section || '-')}</b></span>→<span>학문<br><b>${esc(pod.g.field)}</b></span>→<span>질문 렌즈<br><b>${esc(pod.g.lens)}</b></span></div><p class="pm-note">${esc(pod.g.reason)}</p><p class="pm-note warn">게스트 교수는 AI가 연기하는 가상 인물 — 첫 마디에 밝힌다</p>`);
  later(400, () => A.chief.say('가상 인물 <b>고지</b> 꼭 넣어', 2000));
  A.artist.sayNow(`게스트는 <b>${esc(pod.g.field)} 교수</b>님!`, 1900); await wait(2700);
  cardAdd(3, '게스트', `${pod.g.field} 교수 (AI 가상 인물)\n렌즈: ${pod.g.lens}\n이유: ${pod.g.reason}`);
  cardAdd(3, '대본 (4단계)', PODLIB.stages.map(st => `${st}: ` + pod.lines.filter(l => l.st === st).map(l => `${l.who === 'host' ? '진' : '게'}${l.kind === 'ask' ? '?' : ''}`).join(' ')).join('\n'));

  // (4) 목소리: 엔진 정하기
  A.artist.think('목소리 캐스팅 준비');
  const spec = voiceSpec(pod); R.pod.spec = spec;
  mon('목소리 사양 — 기능 규칙', specTable(spec));
  const bankOK = R.demoUsed.has('pod') && await BANK.load();
  const eng = await decide({ title: '게스트 목소리를 무엇으로 만들까요?', text: `제작부가 ${pod.g.field} 교수의 목소리를 ‘어울림’이 아니라 기능 규칙으로 설계했어요. 후보 목소리를 실제로 녹음해 음높이·억양 폭·말 속도를 재고, 점수로 골라요.`, choices: [
    ...(bankOK ? [{ label: 'Supertonic 3 녹음본', desc: '같은 방식으로 미리 만들어 둔 오디션과 녹음을 바로 들어요. 데모용.', small: '무료 · 한국어 · 대기 없음', rec: true, value: 'bank' }] : []),
    { label: 'Supertonic 3 · 지금 생성', desc: 'Supertone의 한국어 음성 모델을 이 브라우저 안에서 돌려요. 키가 필요 없어요.', small: `무료 · 처음 한 번 모델 약 400MB${bankOK ? '' : ' · 추천'}`, rec: !bankOK, value: 'supertonic' },
    { label: 'ElevenLabs', desc: '목소리를 설계문으로 새로 만들어 녹음해요.', small: XI.key ? '저장된 키 사용' : 'API 키 필요', value: 'eleven' },
    { label: '브라우저 기본 음성', desc: '설치된 시스템 음성으로 빠르게 미리 들어요. 품질이 낮아요.', small: '측정 오디션 없음', value: 'browser' }] });
  A.artist.hush();
  let engine = eng.value;
  if (engine === 'eleven' && !XI.key) {
    const kp = decide({ title: 'ElevenLabs API 키를 넣어 주세요', text: '키는 이 브라우저에만 저장돼요. 없으면 Supertonic 3로 진행해요.', inputs: [{ key: 'xi', placeholder: 'ElevenLabs API 키 (xi-api-key)' }], submit: [{ label: '이 키로 진행', value: 'ok' }, { label: '키 없이 Supertonic 3로', value: 'no', ghost: true }] });
    const kin = $('#in-xi'); if (kin) { kin.type = 'password'; kin.autocomplete = 'off'; }
    const k = await kp; if (k.value === 'ok' && k.inputs?.xi) XI.key = k.inputs.xi; else engine = 'supertonic';
  }
  const ENGN = { bank: 'Supertonic 3 녹음본', supertonic: 'Supertonic 3', eleven: 'ElevenLabs', browser: '브라우저 기본 음성' };
  logit('reader', `목소리 엔진 선택 — ${ENGN[engine]}`);
  cardAdd(4, '목소리 사양', spec.rows.map(r => `· ${r.axis}: ${r.value} (${r.kind})`).join('\n'), { hitl: true });

  // (5) 캐스팅
  let voices = null;
  if (engine === 'bank') { try { voices = await castBank(pod, spec, mon); } catch (e) { console.warn(e); engine = 'supertonic'; } }
  if (engine === 'eleven') {
    try { voices = await castEleven(pod, spec, mon); }
    catch (e) { console.warn(e); logit('artist', `ElevenLabs 캐스팅 실패 — ${e.message}`, 'ElevenLabs'); toast(`ElevenLabs를 쓸 수 없어요 (${e.status || '연결'}). Supertonic 3로 이어갈게요.`, 6500); if (e.status === 401) XI.key = ''; engine = 'supertonic'; }
  }
  if (engine === 'supertonic') {
    try { voices = await castSupertonic(pod, spec, mon); }
    catch (e) { console.warn(e); logit('artist', `Supertonic 실패 — ${e.message}`, 'Supertonic 3'); toast(`Supertonic 3를 이 브라우저에서 열지 못했어요 (${clip(e.message, 40)}). 기본 음성으로 이어갈게요.`, 7000); engine = 'browser'; }
  }
  if (engine === 'browser') voices = await castBrowser(pod, spec, mon);
  pod.voices = voices; pod.engine = engine;

  // (6) 녹음 — 모션 부스가 녹음 부스가 된다
  show(monClose, false);
  talk([[A.artist, '목소리 정했어요. <b>녹음 부스</b>로!', 0, 1800], [A.pd, '생각 틈 1.5초, 좋다', 800, 1600]]);
  onDuty('reporter', 'pd'); later(700, async () => { await A.pd.walkTo('corkWatchP', { status: '녹음 구경' }); A.pd.face('right'); });
  camera([0.78, 0.78], 1.35);
  await A.artist.walkTo('video', { status: '녹음 부스로 이동', face: 'right' });
  A.artist.status('녹음 중', true);
  await recordEpisode(pod, a, b);
  offDuty('reporter', 'pd');
  cardAdd(4, '녹음', pod.engine === 'browser' ? `브라우저 기본 음성(미리듣기) · ${pod.lines.length}줄` : `${pod.engine === 'eleven' ? 'ElevenLabs ' + pod.model : pod.engine === 'bank' ? 'Supertonic 3 녹음본' : 'Supertonic 3 (브라우저 생성)'} · 대화 ${pod.lines.length}줄 · ${pod.dur ? Math.round(pod.dur) + '초' : ''} · 진행자 ${pod.voices.host.v || ''} / 게스트 ${pod.voices.guest.v || ''}`);
  show(motionClose, false);

  // 6 · 검수 · 보도
  camera([0.36, 0.72], 1.25); duty('chief', 'artist', 'reporter', 'pd');
  later(300, () => A.reporter.walkTo('reviewWatchR', { status: '검수 참관', face: 'left' }));
  later(900, () => A.pd.walkTo('reviewWatchP', { status: '검수 참관', face: 'left' }));
  A.chief.walkTo('reviewChief', { status: '검수 테이블', face: 'left' });
  await A.artist.walkTo('reviewArtist', { status: '국장에게 보고하러', face: 'left' });
  await handoff(A.artist, A.chief, waveNode(), `국장님, <b>EP.1</b> 녹음본이에요.`, '원문 펼쳐 놓고 들어 보자'); cardHold('chief');
  A.reporter.faceTo(A.chief); A.pd.faceTo(A.chief);
  setStep(5); A.chief.think('원문과 대조 중');
  reviewClose.innerHTML = `<h6>국장 검수 — 대본 · 원문 대조</h6><div id="rvRows"></div>`; show(reviewClose);
  let rv = live ? await askJSON('chief', '팟캐스트 원문 대조 검수', PR.podReview(a, b, pod.lines), 'default') : null;
  if (!Array.isArray(rv)) { await wait(1300); rv = R.demoUsed.has('pod') ? structuredClone(DEMO_POD.review) : []; }
  A.chief.hush(); A.chief.status('검수 중', true);
  for (const r of rv) {
    const it = el('div', 'li'); it.innerHTML = `<span class="v ${r.verdict === '통과' ? 'pass' : 'fix'}">${esc(r.verdict)}</span><span><b>${r.n}줄 · ${esc(r.check || '')}</b><br>${esc(r.issue || '')}${r.fixed ? `<br><span style="color:#2e7d4f">→ ${esc(clip(r.fixed, 70))}</span>` : ''}</span>`;
    $('#rvRows').append(it); await wait(60); it.classList.add('in');
    A.chief.sayNow(r.verdict === '통과' ? `${r.n}줄 <b>통과</b>` : `${r.n}줄 <b>수정</b> — ${esc(clip(r.issue || '', 18))}`, 1300); await wait(1000);
  }
  const fixes = rv.filter(r => r.verdict !== '통과' && r.fixed);
  fixes.forEach(r => { const l = pod.lines[r.n - 1]; if (l) { l.text = r.fixed; l.fixNote = `국장 검수에서 수정 — ${r.issue || ''}`; if (l.say && !l.text.includes(l.say)) l.say = ''; } });
  cardAdd(5, '검수 결과', rv.map(r => `${r.n}줄 ${r.verdict}${r.issue ? ' — ' + r.issue : ''}`).join('\n'));
  if (fixes.length) {
    await talk([[A.chief, `<b>${fixes.length}줄</b> 고쳐서 다시 녹음해. 해석은 해석이라고 밝히고!`, 0, 2300], [A.artist, '재녹음할게요', 1300, 1400]]);
    A.artist.think('재녹음 중'); await recordEpisode(pod, a, b, true); A.artist.hush(); show(motionClose, false);
  } else await A.chief.say('전부 <b>통과</b>.', 1500);
  for (;;) {
    A.chief.sayNow('마지막은 <b>독자</b> 확인이야', 2200);
    const rr = await decide({ title: '보도 전에 확인해 주세요', text: '국장 검수가 끝났어요. 바로 보도하거나, 고칠 점을 적으면 제작부가 대본을 고쳐 다시 녹음해요.', textarea: { placeholder: '예) 진행자 질문을 더 짧게 / 게스트 설명을 한 문장 줄여 줘' }, submit: [{ label: '보도하기', value: 'go' }, { label: '의견 반영해서 다시 녹음', value: 'rev', ghost: true }] });
    if (rr.value === 'go' || !rr.text) break;
    logit('reader', `검수 의견 — ${rr.text}`); cardAdd(5, '독자 의견', rr.text, { hitl: true });
    A.artist.think('대본 고치는 중');
    const nl = live ? await askJSON('artist', '독자 의견 반영', PR.podRevise(pod.lines, rr.text), 'quick') : null;
    const arr = Array.isArray(nl) ? nl : nl?.lines;
    if (Array.isArray(arr) && arr.length) { pod.lines = arr; tidyPod(pod, a, b); await recordEpisode(pod, a, b, true); show(motionClose, false); }
    else { await wait(1200); toast(live ? '수정본을 받지 못해 기존 녹음을 유지해요.' : '데모에서는 의견이 기록만 되고 녹음은 그대로예요.'); }
    A.artist.hush(); await A.artist.say('반영했어요!', 1200);
  }
  show(reviewClose, false); A.chief.carry(null);
  cardAdd(6, '보도', `팟캐스트체 EP.1 «${pod.episode?.title || ''}» · ${new Date().toLocaleString('ko-KR')}`); cardHold(null);
  camera(null);
  await talk([[A.chief, '좋아, <b>송출</b>해!', 0, 1700], [A.reporter, '송출!', 350, 1300], [A.pd, '다음 화 게스트도 벌써 보여요', 600, 1800], [A.artist, '수고하셨습니다!', 900, 1400]]);
  R.finished = new Date().toISOString(); R.cardFields = CARD.fields.map(f => ({ v: f.v, label: f.label, value: typeof f.value === 'string' ? f.value : f.value?.text, hitl: !!f.hitl }));
  saveRun(); openPodReader();
}
DEMO.pod = DEMO_POD;

function specTable(spec) {
  return `<table class="pm-spec">${spec.rows.map(r => `<tr><th>${esc(r.axis)}</th><td><b>${esc(r.value)}</b><span>${esc(r.why)}</span></td><td><em class="k ${r.kind === '관습(약)' ? 'weak' : ''}">${esc(r.kind)}</em></td></tr>`).join('')}</table>`;
}
function waveNode() { const w = el('div', 'wave-chip'); w.innerHTML = '<i></i><i></i><i></i><i></i><i></i><b>EP.1</b>'; return w; }

async function castEleven(pod, spec, mon) {
  const say = t => { A.artist.status(t, true); logit('artist', t, 'ElevenLabs'); };
  const host = await ensureHostVoice(say);
  const reuse = await findSavedGuest(spec.field);
  if (reuse) {
    say(`저장된 ${spec.field} 교수 목소리를 다시 불러요 (게스트 릴레이)`);
    const st = XI.get('m_' + reuse.voice_id);
    pod.audition = { reused: true, name: reuse.name, host: host.m, list: st ? [{ n: 1, m: st, s: auditionScore(st, host.m, spec), pick: true }] : [] };
    mon('목소리 — 저장된 게스트 재사용', `${specTable(spec)}<p class="pm-note">같은 학문의 게스트는 같은 목소리로 돌아온다. 저장된 목소리: <b>${esc(reuse.name)}</b></p>`);
    A.artist.sayNow(`${esc(spec.field)} 교수님, <b>또 오셨네요</b>`, 2000); await wait(2400);
    return { host: host.id, guest: reuse.voice_id };
  }
  const guestFirst = pod.lines.filter(l => l.who === 'guest').map(l => l.text).join(' ');
  let text = guestFirst.slice(0, 600); if (text.length < 110) text = (text + ' ' + guestFirst + ' 오늘 기사에서 확인된 사실부터 차근차근 짚어 볼게요.').slice(0, 600);
  say('목소리 설계문으로 후보 3개 생성 중');
  mon('목소리 설계 → 후보 3개', `${specTable(spec)}<p class="pm-desc">${esc(spec.desc)}</p><p class="pm-note">ElevenLabs · Voice Design(eleven_ttv_v3)으로 생성 중…</p>`);
  const pv = await designPreviews(spec.desc, text);
  say('오디션 — 후보 3개를 측정해요');
  const list = [];
  for (const p of pv) {
    let m = null; try { m = await measureVoice(p.url, text); } catch (e) { console.warn(e); }
    if (m) list.push({ ...p, m, s: auditionScore(m, host.m, spec) });
    mon('오디션 — 측정해서 고른다', auditionSVG(list, host.m, spec) + auditionRows(list));
    A.artist.sayNow(`후보 ${p.n} 듣는 중`, 1500);
    try { const au = new Audio(p.url); au.volume = 0.9; await au.play(); await new Promise(r => { const t = setTimeout(r, 3200 / Math.max(1, SPEED)); au.onended = () => { clearTimeout(t); r(); }; }); au.pause(); } catch { await wait(900); }
  }
  if (!list.length) throw new Error('후보 목소리를 측정하지 못했어요');
  const best = [...list].sort((x, y) => y.s.total - x.s.total)[0]; best.pick = true;
  mon('오디션 결과', auditionSVG(list, host.m, spec) + auditionRows(list));
  A.artist.sayNow(`<b>후보 ${best.n}</b>! 진행자와 ${best.s.d}반음 차이라 귀로 갈라져요`, 2600); await wait(2800);
  pod.audition = { reused: false, host: host.m, list: list.map(({ url, ...x }) => x) };
  try {
    const v = await XI.req('/v1/text-to-voice', { method: 'POST', body: { voice_name: `AI편집국 게스트 · ${spec.field} 교수`, voice_description: spec.desc, generated_voice_id: best.id, labels: { newsroom: 'ai-newsroom', role: 'guest', field: spec.field }, played_not_selected_voice_ids: list.filter(x => !x.pick).map(x => x.id) } });
    XI.put('m_' + v.voice_id, best.m);
    logit('artist', `게스트 목소리 저장 — ${spec.field} 교수 (다음 화에 재사용)`, 'ElevenLabs · text-to-voice');
    return { host: host.id, guest: v.voice_id };
  } catch (e) {
    toast('게스트 목소리를 저장하지 못해(저장 공간 등) 이번 화에만 써요.', 6000); logit('artist', `목소리 저장 실패 — ${e.message}`, 'ElevenLabs');
    pod.audition.unsaved = true; return { host: host.id, guest: best.id };
  }
}
async function castBrowser(pod, spec, mon) {
  const vs = await BRV.ready();
  const hv = vs[0] || null, gv = vs[1] || vs[0] || null;
  const v = { host: { voice: hv?.name || '기본', pitch: 1.15, rate: 1.02 }, guest: { voice: gv?.name || '기본', pitch: 0.72, rate: +(1.02 * spec.rate).toFixed(2) } };
  pod.audition = { browser: true, voices: vs.map(x => x.name) };
  mon('목소리 — 브라우저 음성 미리듣기', `${specTable(spec)}<p class="pm-note">ElevenLabs 키가 없어 설계·측정 오디션은 건너뛰고, 사양을 음높이·속도 값으로만 옮겼어요.<br>진행자 ${esc(v.host.voice)} · 높이 ${v.host.pitch} / 게스트 ${esc(v.guest.voice)} · 높이 ${v.guest.pitch} · 속도 ${v.guest.rate}${vs.length ? '' : '<br>이 브라우저에 한국어 음성이 없어 소리 없이 자막으로만 재생될 수 있어요.'}</p>`);
  A.artist.sayNow('키가 없어서 <b>미리듣기</b> 음성으로 갈게요', 2000); await wait(2600);
  return v;
}
function auditionRows(list) {
  return `<table class="pm-aud"><tr><th></th><th>음높이</th><th>진행자와 차이</th><th>억양 폭</th><th>말 속도</th><th>점수</th></tr>${list.map(x => `<tr class="${x.pick ? 'pick' : ''}"><td>${x.v ? esc(x.v) : '후보 ' + x.n}${x.pick ? ' ✓' : ''}</td><td>${x.m.f0}Hz</td><td>${x.s.d}반음</td><td>${x.m.rangeSt}반음</td><td>${x.m.rate ?? '-'}음절/초</td><td><b>${x.s.total}</b></td></tr>`).join('')}</table><p class="pm-note">점수 = 구별 0.5 + 억양 폭 0.3 + 말 속도 0.2 (연령감은 점수에 넣지 않음)</p>`;
}
function auditionSVG(list, host, spec) {
  const X = f => 20 + (Math.log2(f / 70) / Math.log2(330 / 70)) * 400;
  const hx = host?.f0 ? X(host.f0) : null;
  return `<svg viewBox="0 0 440 86" class="pm-plot"><line x1="20" y1="58" x2="420" y2="58" stroke="#3a4a66"/>${[80, 120, 160, 200, 250, 300].map(f => `<line x1="${X(f)}" y1="55" x2="${X(f)}" y2="61" stroke="#3a4a66"/><text x="${X(f)}" y="74" fill="#7f93b8" font-size="9" text-anchor="middle">${f}Hz</text>`).join('')}
  ${hx ? `<rect x="${Math.min(hx, X(host.f0 / Math.pow(2, spec.contrastSt / 12)))}" y="36" width="${Math.abs(hx - X(host.f0 / Math.pow(2, spec.contrastSt / 12)))}" height="22" fill="rgba(124,58,237,.18)"/><line x1="${hx}" y1="20" x2="${hx}" y2="58" stroke="#C4B5FD" stroke-width="2"/><text x="${hx}" y="14" fill="#C4B5FD" font-size="10" text-anchor="middle">진행자 ${host.f0}Hz</text><text x="${X(host.f0 / Math.pow(2, spec.contrastSt / 12))}" y="32" fill="#a78bfa" font-size="8.5" text-anchor="middle">−${spec.contrastSt}반음</text>` : ''}
  ${list.map(x => `<g><circle cx="${X(x.m.f0)}" cy="47" r="${x.pick ? 8 : 6}" fill="${x.pick ? '#E9C46A' : '#7FB3FF'}" stroke="#0F1622" stroke-width="2"/><text x="${X(x.m.f0)}" y="50.5" font-size="9" font-weight="700" text-anchor="middle" fill="#0F1622">${x.v ? x.v.slice(1) : x.n}</text></g>`).join('')}</svg>`;
}

// ───────────── 녹음 ─────────────
async function recordEpisode(pod, a, b, again = false) {
  const rows = pod.lines.map(l => `<div class="rl" data-n="${l.n}"><i class="${l.who}"></i><span>${esc(clip(l.text, 34))}</span><b></b></div>`).join('');
  motionClose.innerHTML = `<div class="rec-booth"><div class="rec-h"><span class="rec">● ${again ? '재녹음' : '녹음'}</span><span>${{ eleven: 'ElevenLabs · Text to Dialogue', supertonic: 'Supertonic 3 · 브라우저 생성', bank: 'Supertonic 3 · 녹음본' }[pod.engine] || '브라우저 음성 · 미리듣기'}</span></div><div class="rec-lines">${rows}</div></div>`;
  show(motionClose);
  const mark = (n, t) => { const r = motionClose.querySelector(`.rl[data-n="${n}"]`); if (r) { r.classList.add('done'); r.querySelector('b').textContent = t; } };
  if (pod.engine === 'bank' || pod.engine === 'supertonic') {
    try { if (pod.engine === 'bank') await recordBank(pod, mark); else await recordSupertonic(pod, mark); return; }
    catch (e) { console.warn(e); toast(`녹음 실패 — 기본 음성으로 미리 들을게요. (${clip(e.message, 40)})`, 6500); logit('artist', `녹음 실패 — ${e.message}`, 'Supertonic 3'); pod.engine = 'browser'; pod.voices = await castBrowser(pod, pod.spec, () => { }); }
  }
  if (pod.engine === 'eleven') {
    try {
      await recordEleven(pod, (n, t) => mark(n, t));
      if (!pod.cueUrl && pod.signs.find(s => s.k === 'sfx')?.on !== false) {
        try { const bl = await XI.req('/v1/sound-generation?output_format=mp3_44100_128', { method: 'POST', body: { text: PODLIB.cuePrompt, duration_seconds: 1.2, prompt_influence: 0.6, model_id: 'eleven_text_to_sound_v3' }, raw: true }); pod.cueUrl = URL.createObjectURL(bl); logit('artist', '구간 전환음 1개 생성', 'ElevenLabs · sound-generation'); }
        catch (e) { logit('artist', `전환음 생성 실패 — 합성음으로 대체 (${e.status || ''})`, 'ElevenLabs'); }
      }
      return;
    } catch (e) {
      console.warn(e); toast(`녹음 실패 (${e.status || '연결'}) — 브라우저 음성으로 미리 들을게요.`, 6500); logit('artist', `녹음 실패 — ${e.message}`, 'ElevenLabs');
      pod.engine = 'browser'; pod.voices = await castBrowser(pod, pod.spec, () => { });
    }
  }
  for (const l of pod.lines) { await wait(170); mark(l.n, (l.who === 'host' ? '진행자' : '게스트') + (l.kind === 'ask' ? ' · 물음' : '')); }
  estimateTimes(pod);
}
async function recordEleven(pod, mark) {
  const inputs = pod.lines.map(l => ({ text: (l.tag ? l.tag + ' ' : '') + l.text, voice_id: l.who === 'host' ? pod.voices.host : pod.voices.guest }));
  let j, used, last;
  for (const model of ['eleven_v4', 'eleven_v3']) {
    try { logit('artist', `대화 ${inputs.length}줄 녹음 요청`, `ElevenLabs · text-to-dialogue/with-timestamps · ${model}`); j = await XI.req('/v1/text-to-dialogue/with-timestamps?output_format=mp3_44100_128', { method: 'POST', body: { inputs, model_id: model, language_code: 'ko', seed: 20261115 } }); used = model; break; }
    catch (e) { last = e; if (e.status === 401 || e.status === 402) throw e; }
  }
  if (!j) throw last;
  pod.model = used; if (pod.audioUrl) URL.revokeObjectURL(pod.audioUrl); pod.audioUrl = b64url(j.audio_base64);
  const segs = j.voice_segments || []; const al = j.alignment || j.normalized_alignment; const chars = al ? al.characters.join('') : '';
  pod.lines.forEach((l, i) => {
    const s = segs.filter(x => x.dialogue_input_index === i);
    l.t0 = s.length ? Math.min(...s.map(x => x.start_time_seconds)) : null; l.t1 = s.length ? Math.max(...s.map(x => x.end_time_seconds)) : null;
    l.tSay = null;
    if (al && l.say) { const from = s.length ? Math.min(...s.map(x => x.character_start_index)) : 0; const k = chars.indexOf(l.say, from); if (k >= 0) l.tSay = al.character_start_times_seconds[k]; }
    mark(l.n, l.t0 != null ? `${l.t0.toFixed(1)}s` : '');
  });
  const au = new Audio(pod.audioUrl); await new Promise(r => { au.onloadedmetadata = r; au.onerror = r; setTimeout(r, 4000); });
  pod.dur = isFinite(au.duration) ? au.duration : (segs.length ? Math.max(...segs.map(x => x.end_time_seconds)) : 0);
  // 빈 시각 채우기
  pod.lines.forEach((l, i) => { if (l.t0 == null) { const p = pod.lines[i - 1]; l.t0 = p?.t1 ?? 0; l.t1 = l.t0 + l.text.length * 0.12; } if (l.tSay == null && l.say) l.tSay = l.t0 + (l.t1 - l.t0) * (l.text.indexOf(l.say) / l.text.length); });
  logit('artist', `녹음 완료 — ${Math.round(pod.dur)}초, 줄별 시각 ${segs.length}구간 · 글자 정렬 ${al ? '있음' : '없음'}`, `ElevenLabs · ${used}`);
}
function estimateTimes(pod) {
  let t = 0;
  pod.lines.forEach(l => { const r = l.who === 'host' ? pod.voices.host.rate : pod.voices.guest.rate; const d = (l.text.replace(/\s/g, '').length * 0.155) / (r || 1) + 0.35; l.t0 = t; l.t1 = t + d; l.est = d; l.tSay = l.say ? t + d * (l.text.indexOf(l.say) / l.text.length) : null; t += d + 0.25; });
  pod.dur = t; pod.model = 'speechSynthesis';
}

// ───────────── 플레이어 ─────────────
const PLAY = { pod: null, au: null, playing: false, idx: -1, gap: 1.5, insert: null, raf: 0, done: new Set(), bt: 0, bLine: -1, ui: {} };
function podStageStarts(pod) { return pod.lines.map((l, i) => i > 0 && l.st !== pod.lines[i - 1].st); }
function playerInit(pod, ui) {
  playerStop(); Object.assign(PLAY, { pod, ui, idx: -1, done: new Set(), bt: 0, bLine: 0 });
  if (pod.engine !== 'browser' && pod.audioUrl) { PLAY.au = new Audio(pod.audioUrl); PLAY.au.preload = 'auto'; PLAY.au.onended = () => { PLAY.playing = false; ui.state(false); ui.line(-1); }; }
  else PLAY.au = null;
}
function playerStop() { PLAY.playing = false; cancelAnimationFrame(PLAY.raf); clearTimeout(PLAY.insert?.timer); PLAY.insert = null; try { PLAY.au?.pause(); } catch { } try { speechSynthesis.cancel(); } catch { } PLAY.btoken = (PLAY.btoken || 0) + 1; }
function playerNow() { return PLAY.au ? PLAY.au.currentTime : PLAY.bt; }
function playerToggle() { PLAY.playing ? playerPause() : playerPlay(); }
function playerPause() { const t = playerNow(); playerStop(); PLAY.bt = t; PLAY.ui.state(false); PLAY.ui.think(null); }
function playerPlay() {
  const pod = PLAY.pod; if (!pod) return; PLAY.playing = true; PLAY.ui.state(true);
  if (PLAY.au) { if (PLAY.au.ended) { PLAY.au.currentTime = 0; PLAY.done.clear(); } PLAY.au.play().catch(() => { }); tickEleven(); }
  else browserFrom(lineAt(PLAY.bt));
}
function playerSeek(dt) {
  const pod = PLAY.pod; if (!pod) return; const was = PLAY.playing; playerStop();
  const t = Math.max(0, Math.min((pod.dur || 0) - 0.05, playerNow() + dt));
  if (PLAY.au) PLAY.au.currentTime = t; PLAY.bt = PLAY.au ? t : (pod.lines[lineAt(t)]?.t0 ?? t);
  [...PLAY.done].forEach(k => { const [kind, n] = k.split(':'); const l = pod.lines[+n]; if (l && (kind === 'think' ? l.t1 : l.t0) > t) PLAY.done.delete(k); });
  PLAY.ui.time(PLAY.bt, pod.dur); PLAY.ui.line(lineAt(PLAY.bt)); if (was) playerPlay();
}
function playerJump(i) { const l = PLAY.pod?.lines[i]; if (!l) return; playerSeek(l.t0 - playerNow() + 0.01); if (!PLAY.playing) playerPlay(); }
function lineAt(t) { const L = PLAY.pod.lines; let k = 0; L.forEach((l, i) => { if (l.t0 <= t + 0.02) k = i; }); return k; }
function runInsert(kind, n, secs, done) {
  PLAY.done.add(kind + ':' + n);
  if (kind === 'cue') { if (PLAY.pod.cueUrl) { const c = new Audio(PLAY.pod.cueUrl); c.volume = 0.7; c.play().catch(synthCue); } else synthCue(); PLAY.ui.cue(); }
  else PLAY.ui.think(n, secs);
  PLAY.insert = { timer: setTimeout(() => { PLAY.insert = null; PLAY.ui.think(null); done(); }, secs * 1000) };
}
function tickEleven() {
  const pod = PLAY.pod, au = PLAY.au, starts = podStageStarts(pod);
  const loop = () => {
    if (!PLAY.playing) return;
    const t = au.currentTime;
    if (!PLAY.insert) {
      const i = lineAt(t);
      if (i !== PLAY.idx) { PLAY.idx = i; PLAY.ui.line(i); }
      const l = pod.lines[i];
      if (l.tSay != null && t >= l.tSay && !PLAY.done.has('say:' + i)) { PLAY.done.add('say:' + i); PLAY.ui.say(i); }
      const p = pod.lines[i - 1], resume = () => PLAY.playing && au.play().catch(() => { });
      if (l.kind === 'ask' && PLAY.gap > 0 && t >= l.t1 - 0.05 && !PLAY.done.has('think:' + i)) { au.pause(); runInsert('think', i, PLAY.gap, resume); }
      else if (p && p.kind === 'ask' && PLAY.gap > 0 && !PLAY.done.has('think:' + (i - 1)) && t < l.t0 + 0.5) { au.pause(); au.currentTime = Math.max(p.t1, l.t0 - 0.01); runInsert('think', i - 1, PLAY.gap, resume); }
      else if (starts[i] && !PLAY.done.has('cue:' + i) && t < l.t0 + 0.5 && pod.signs.find(s => s.k === 'sfx')?.on !== false) { au.pause(); au.currentTime = Math.max(0, l.t0 - 0.01); runInsert('cue', i, 1.1, resume); }
    }
    PLAY.ui.time(t, pod.dur);
    PLAY.raf = requestAnimationFrame(loop);
  };
  loop();
}
async function browserFrom(i0) {
  const pod = PLAY.pod, starts = podStageStarts(pod), tok = PLAY.btoken = (PLAY.btoken || 0) + 1;
  const alive = () => PLAY.playing && PLAY.btoken === tok;
  const pause = secs => new Promise(r => setTimeout(r, secs * 1000));
  for (let i = i0; i < pod.lines.length; i++) {
    const l = pod.lines[i]; if (!alive()) return;
    if (starts[i] && i !== i0 && pod.signs.find(s => s.k === 'sfx')?.on !== false) { await new Promise(r => runInsert('cue', i, 1.1, r)); if (!alive()) return; }
    PLAY.idx = i; PLAY.ui.line(i); PLAY.bt = l.t0; const t0 = performance.now();
    const clock = setInterval(() => { if (alive()) { PLAY.bt = Math.min(l.t1, l.t0 + (performance.now() - t0) / 1000); PLAY.ui.time(PLAY.bt, pod.dur); } }, 100);
    const sayAt = l.say ? l.text.indexOf(l.say) : -1; let said = false; const fireSay = () => { if (!said && sayAt >= 0) { said = true; PLAY.ui.say(i); } };
    await new Promise(res => {
      let fin = false; const end = () => { if (!fin) { fin = true; clearTimeout(safety); clearTimeout(sayT); res(); } };
      const sayT = sayAt >= 0 ? setTimeout(fireSay, l.est * 1000 * (sayAt / l.text.length)) : 0;
      const vs = BRV.list(); const p = l.who === 'host' ? pod.voices.host : pod.voices.guest;
      let safety = setTimeout(end, (l.est * 1.9 + 1) * 1000);
      if (vs.length) {
        const u = new SpeechSynthesisUtterance(l.text); u.lang = 'ko-KR'; u.voice = vs.find(v => v.name === p.voice) || vs[0]; u.pitch = p.pitch; u.rate = p.rate;
        u.onboundary = e => { if (sayAt >= 0 && e.charIndex >= sayAt) fireSay(); };
        u.onstart = () => { clearTimeout(safety); safety = setTimeout(end, (l.est * 2.6 + 2) * 1000); };
        u.onend = end; u.onerror = end; speechSynthesis.speak(u);
      } else { clearTimeout(safety); safety = setTimeout(end, l.est * 1000); }
    });
    clearInterval(clock); fireSay(); if (!alive()) return;
    PLAY.bt = l.t1;
    if (l.kind === 'ask' && PLAY.gap > 0) { await new Promise(r => runInsert('think', i, PLAY.gap, r)); if (!alive()) return; }
  }
  PLAY.playing = false; PLAY.ui.state(false); PLAY.ui.line(-1); PLAY.bt = 0;
}

// ───────────── 팟캐스트 보기 (폴더블 대조 화면) ─────────────
const ICON = {
  back: '<svg viewBox="0 0 40 40"><path d="M14.5 9.5 A13 13 0 1 0 25.5 9.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M19 4 L13.6 9.6 L19.4 13.6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="20" y="26.5" font-size="12" font-weight="800" text-anchor="middle" fill="currentColor">5</text></svg>',
  fwd: '<svg viewBox="0 0 40 40"><path d="M25.5 9.5 A13 13 0 1 1 14.5 9.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M21 4 L26.4 9.6 L20.6 13.6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><text x="20" y="26.5" font-size="12" font-weight="800" text-anchor="middle" fill="currentColor">5</text></svg>',
  play: '<svg viewBox="0 0 40 40"><path d="M15 11 L30 20 L15 29 Z" fill="currentColor"/></svg>',
  pause: '<svg viewBox="0 0 40 40"><rect x="13" y="11" width="5" height="18" rx="1.6" fill="currentColor"/><rect x="22" y="11" width="5" height="18" rx="1.6" fill="currentColor"/></svg>'
};
const fmt = s => { s = Math.max(0, s || 0); return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`; };
function openPodReader() {
  const r = RUN, pod = r?.pod; if (!pod) return;
  playerStop(); PLAY.gap = parseFloat(pod.signs.find(s => s.k === 'silence')?.use?.match(/[\d.]+/)?.[0]) || 1.5;
  $('.rd').classList.add('wide');
  const strip = $('#strip'); strip.innerHTML = ''; strip.classList.add('podstrip');
  const art = (k, x) => x ? `<div class="pd-art" data-art="${k}"><h6>기사 ${k} · ${esc(x.outlet)}${x.section ? ' ' + esc(x.section) + '면' : ''}</h6><div class="pd-ttl">${esc(x.title)}</div><p>${sentencesOf(x.body).map((s, i) => `<span class="sn" data-art="${k}" data-si="${i}">${esc(s)}</span>`).join(' ')}</p></div>` : '';
  const starts = podStageStarts(pod);
  strip.innerHTML = `
  <div class="titlecard pd-tc"><small>나만의 AI 편집국 · 팟캐스트체 · ${esc(pod.narrative?.type || '')}</small><h2>EP.1 ${esc(pod.episode?.title || '')}</h2>
    <div class="chainline"><span>기사 A · ${esc(r.A.outlet)}${r.A.section ? ' ' + esc(r.A.section) : ''}</span>→<span class="r">레마 “${esc(r.analysis.chosen.rheme)}”</span>${r.B ? `→<span>기사 B · ${esc(r.B.outlet)}${r.B.section ? ' ' + esc(r.B.section) : ''}</span>` : ''}</div></div>
  <div class="pd-fold">
    <section class="pd-src" aria-label="원문 기사"><div class="pd-lab">원문 · 기사 A → B</div>${art('A', r.A)}${art('B', r.B)}<div class="pd-legend"><span><i class="q">?</i>물음이 생긴 문장</span><span><i class="a"></i>답이 된 문장</span><span><i class="f"></i>사실을 옮긴 문장</span></div></section>
    <section class="pd-play" aria-label="팟캐스트">
      <div class="pd-card">
        <div class="pd-head"><span class="ep">EP.1</span><div><b>${esc(r.B?.section || pod.g.section || '')}면 · 질문 · ${esc((pod.narrative?.type || '').replace('질문·', ''))}</b><small>진행자(제작부) × ${esc(pod.g.field)} 교수 <em>AI 가상 인물</em></small></div></div>
        <div class="pd-lane" id="pdLane"></div>
        <div class="pd-ctrl"><button id="pdBack" aria-label="5초 뒤로">${ICON.back}</button><button id="pdPlay" class="big" aria-label="재생">${ICON.play}</button><button id="pdFwd" aria-label="5초 앞으로">${ICON.fwd}</button><span id="pdTime">0:00 / ${fmt(pod.dur)}</span></div>
        <div class="pd-gap"><span>생각 틈</span>${[0, 1.5, 3].map(s => `<button data-g="${s}" class="${s === PLAY.gap ? 'on' : ''}">${s}초</button>`).join('')}<small>${pod.engine === 'browser' ? '브라우저 기본 음성 미리듣기' : esc(pod.model || '') + (pod.engine === 'bank' ? ' · 녹음본' : '')}</small></div>
      </div>
      <ol class="pd-lines" id="pdLines">${pod.lines.map((l, i) => `${i === 0 || starts[i] ? `<li class="st">${esc(l.st)}</li>` : ''}<li class="ln ${l.who} ${l.kind}" data-i="${i}"><i>${l.who === 'host' ? '진' : '게'}</i><div><b>${l.who === 'host' ? '진행자' : esc(pod.g.field) + ' 교수'}${l.kind === 'ask' ? '<em>물음</em>' : l.kind === 'ans' ? '<em class="a">답</em>' : ''}${l.fixNote ? '<em class="fx">검수 수정</em>' : ''}</b><span>${l.say ? esc(l.text).replace(esc(l.say), `<u>${esc(l.say)}</u>`) : esc(l.text)}</span></div></li>${l.kind === 'ask' ? `<li class="think" data-i="${i}"><span class="dots"><i></i><i></i><i></i></span>생각 틈 · 답을 듣기 전에 왼쪽 원문에서 먼저 찾아보세요</li>` : ''}`).join('')}</ol>
    </section>
  </div>`;
  strip.insertAdjacentHTML('beforeend', `<p style="color:#8a7b68;font-size:12px;padding:6px 22px 10px;margin:0">AI가 기사 원문의 사실을 재구성한 대화예요. 게스트 교수는 AI가 연기하는 가상 인물이에요. 정확한 내용은 원문에서 확인해 주세요.</p>`);
  drawLane(pod);
  const src = strip.querySelector('.pd-src');
  const sn = l => l?.art && l.si >= 0 ? src.querySelector(`.sn[data-art="${l.art}"][data-si="${l.si}"]`) : null;
  const ui = {
    line(i) {
      strip.querySelectorAll('.pd-lines .ln.now').forEach(x => x.classList.remove('now'));
      src.querySelectorAll('.sn.now').forEach(x => x.classList.remove('now'));
      const lane = $('#pdLane'); lane?.querySelectorAll('.seg.now').forEach(x => x.classList.remove('now'));
      if (i < 0) return;
      const l = pod.lines[i]; const li = strip.querySelector(`.pd-lines .ln[data-i="${i}"]`); li?.classList.add('now'); li?.classList.add('heard');
      lane?.querySelector(`.seg[data-i="${i}"]`)?.classList.add('now');
      scrollIn($('#pdLines'), li);
      const s = sn(l); if (s) { s.classList.add('now', { ask: 'q', ans: 'a', fact: 'f' }[l.kind] || 'f'); scrollIn(src, s); }
    },
    say(i) {
      const l = pod.lines[i]; const s = sn(l); if (!s || !l.ev) return;
      const txt = s.dataset.raw || (s.dataset.raw = s.textContent); if (!txt.includes(l.ev)) return;
      const evs = new Set((s.dataset.evs || '').split('\u0001').filter(Boolean)); evs.add(l.ev); s.dataset.evs = [...evs].join('\u0001');
      let h = esc(txt); [...evs].sort((x, y) => y.length - x.length).forEach(e => { h = h.split(esc(e)).join(`<mark data-ev="${esc(e)}">${esc(e)}</mark>`); }); s.innerHTML = h;
      const m = [...s.querySelectorAll('mark')].find(x => x.dataset.ev === l.ev); if (m) { void m.offsetWidth; m.classList.add('hit'); }
      strip.querySelector(`.pd-lines .ln[data-i="${i}"] u`)?.classList.add('lit');
    },
    think(i, secs) {
      strip.querySelectorAll('.pd-lines .think.on').forEach(x => x.classList.remove('on'));
      src.classList.toggle('thinking', i != null);
      if (i == null) return; const t = strip.querySelector(`.pd-lines .think[data-i="${i}"]`); t?.style.setProperty('--d', secs + 's'); t?.classList.add('on');
      (RUN.listen = RUN.listen || []).push({ think: i + 1, gap: secs, t: new Date().toISOString() });
    },
    cue() { const c = strip.querySelector('.pd-card'); c.classList.remove('cue'); void c.offsetWidth; c.classList.add('cue'); },
    time(t, d) { $('#pdTime').textContent = `${fmt(t)} / ${fmt(d)}`; const h = $('#pdHead'); if (h) h.style.left = (d ? Math.min(100, t / d * 100) : 0) + '%'; },
    state(on) { $('#pdPlay').innerHTML = on ? ICON.pause : ICON.play; $('#pdPlay').setAttribute('aria-label', on ? '일시정지' : '재생'); strip.querySelector('.pd-card').classList.toggle('playing', on); }
  };
  playerInit(pod, ui);
  $('#pdPlay').onclick = () => { playerToggle(); logit('reader', PLAY.playing ? '팟캐스트 재생' : '팟캐스트 일시정지'); };
  $('#pdBack').onclick = () => playerSeek(-5); $('#pdFwd').onclick = () => playerSeek(5);
  strip.querySelectorAll('.pd-gap button').forEach(b => b.onclick = () => { PLAY.gap = +b.dataset.g; strip.querySelectorAll('.pd-gap button').forEach(x => x.classList.toggle('on', x === b)); logit('reader', `생각 틈 ${PLAY.gap}초로 바꿈`); (RUN.listen = RUN.listen || []).push({ gapSet: PLAY.gap, t: new Date().toISOString() }); });
  $('#pdLines').addEventListener('click', e => { const li = e.target.closest('.ln'); if (li) { playerJump(+li.dataset.i); (RUN.taps = RUN.taps || []).push({ line: +li.dataset.i + 1, t: new Date().toISOString() }); } });
  $('#pdLane').addEventListener('click', e => { const s = e.target.closest('.seg'); if (s) playerJump(+s.dataset.i); });
  renderPodWhy(r, pod);
  $('#rdSrc').innerHTML = `<h4>원문 기사</h4><p style="margin:0;font-size:13px;line-height:1.8">A · ${r.A.url ? `<a href="${esc(r.A.url)}" target="_blank" rel="noopener">${esc(r.A.title)}</a>` : esc(r.A.title)} (${esc(r.A.outlet)})${r.B ? `<br>B · ${r.B.url ? `<a href="${esc(r.B.url)}" target="_blank" rel="noopener">${esc(r.B.title)}</a>` : esc(r.B.title)} (${esc(r.B.outlet)})` : ''}<br><span style="color:var(--ink-3)">연결: ${esc(r.bAnalysis?.link || '')}</span></p>`;
  renderFeedback(); $('#whySheet').hidden = true;
  $('#rdNext').hidden = !r.B?.url;
  $('#reader').classList.add('show'); $('#reader').scrollTop = 0;
}
function scrollIn(box, it) { if (!box || !it) return; const b = box.getBoundingClientRect(), r = it.getBoundingClientRect(); box.scrollTo({ top: box.scrollTop + (r.top - b.top) - box.clientHeight / 3, behavior: 'smooth' }); }
function verMedia(m) { const pod = m === 'podcast'; VER[3].t = pod ? '제작부 · 소리 기호/서사 · 대본' : '제작부 · 표현/서사 · 컷 대본'; VER[4].t = pod ? '제작부 · 목소리 설계 · 녹음' : '제작부 · 이미지·모션 생성'; }
function drawLane(pod) {
  const lane = $('#pdLane'); const d = pod.dur || 1; const gap = PLAY.gap;
  lane.innerHTML = pod.lines.map((l, i) => `<div class="seg ${l.who} ${l.kind}" data-i="${i}" style="left:${l.t0 / d * 100}%;width:${Math.max(0.6, (l.t1 - l.t0) / d * 100)}%" title="${esc(l.who === 'host' ? '진행자' : '게스트')} · ${esc(clip(l.text, 30))}">${l.kind === 'ask' ? '<b>?</b>' : ''}</div>`).join('') + `<div class="head" id="pdHead"></div><div class="axis"><span>진행자</span><span>게스트</span></div>`;
  if (pod.engine !== 'browser' && pod.audioUrl) drawWave(pod.audioUrl, lane).catch(() => { });
}
async function drawWave(url, lane) {
  const ab = await (await fetch(url)).arrayBuffer(); const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC(); const buf = await ac.decodeAudioData(ab); ac.close?.();
  const x = buf.getChannelData(0); const N = 240; const blk = Math.floor(x.length / N); const pk = [];
  for (let i = 0; i < N; i++) { let m = 0; for (let j = 0; j < blk; j += 8) m = Math.max(m, Math.abs(x[i * blk + j])); pk.push(m); }
  const mx = Math.max(...pk) || 1;
  lane.insertAdjacentHTML('afterbegin', `<svg class="wave" viewBox="0 0 ${N} 40" preserveAspectRatio="none">${pk.map((v, i) => `<rect x="${i}" y="${20 - v / mx * 18}" width=".7" height="${Math.max(.6, v / mx * 36)}"/>`).join('')}</svg>`);
}
function renderPodWhy(r, pod) {
  const au = pod.audition || {};
  $('#rdWhy').innerHTML = `<h4>제작부는 왜 이렇게 만들었나 — 기사 내용 → 소리 기호 · 서사 · 목소리</h4>
  <p style="margin:0 0 8px;color:var(--ink-2);font-size:13px"><b>서사: ${esc(pod.narrative?.type || '')}</b> — ${esc(pod.narrative?.why || '')}</p>
  <table><tr><th>소리 기호</th><th>이 기사에서</th><th>근거</th></tr>${PODLIB.signs.map(s => { const x = pod.signs.find(y => y.k === s.k) || {}; return `<tr><td>${esc(s.name)}</td><td>${esc(x.use || '-')}</td><td>${esc(x.why || '')}</td></tr>`; }).join('')}</table>
  <h4 style="margin-top:14px">서사 5유형 판정</h4><table>${(pod.verdicts || []).map(v => `<tr><td style="width:7em">${esc(v.type)}</td><td style="width:4.5em"><b>${esc(v.v)}</b></td><td>${esc(v.why)}</td></tr>`).join('')}</table>
  <h4 style="margin-top:14px">게스트 — 레마가 게스트를 부른다</h4><p style="margin:0;font-size:13px">레마 “${esc(r.analysis.chosen.rheme)}” → ${esc(pod.g.section || '')}면 → <b>${esc(pod.g.field)}</b> → 질문 렌즈 “${esc(pod.g.lens)}”<br><span style="color:var(--ink-2)">${esc(pod.g.reason || '')}</span></p>
  <h4 style="margin-top:14px">게스트 목소리 — ‘어울림’ 대신 기능 규칙으로 설계하고, 측정해서 고른다</h4>
  <table><tr><th>축</th><th>정한 값</th><th>근거</th><th>근거 종류</th></tr>${pod.spec.rows.map(x => `<tr><td>${esc(x.axis)}</td><td>${esc(x.value)}</td><td>${esc(x.why)}</td><td>${esc(x.kind)}</td></tr>`).join('')}</table>
  <p style="margin:8px 0 0;font-size:12px;color:var(--ink-3)">설계문: ${esc(pod.spec.desc)}</p>
  ${au.list?.length ? `<table style="margin-top:8px"><tr><th>후보</th><th>음높이</th><th>진행자와 차이</th><th>억양 폭</th><th>말 속도</th><th>점수</th></tr>${au.list.map(x => `<tr><td>${x.pick ? '<b>✓ ' : ''}${x.v ? esc(x.v) : '후보 ' + x.n}${x.pick ? '</b>' : ''}</td><td>${x.m.f0}Hz</td><td>${x.s.d}반음</td><td>${x.m.rangeSt}반음</td><td>${x.m.rate ?? '-'}</td><td>${x.s.total}</td></tr>`).join('')}</table><p style="margin:4px 0 0;font-size:12px;color:var(--ink-3)">${au.engine === 'supertonic' ? `Supertonic 3 프리셋 ${au.list.length}개를 같은 대사로 녹음해 측정 · 진행자 ${esc(au.host?.v || '')} ` : '진행자 '}${au.host?.f0 || '-'}Hz 기준 · 점수 = 구별 0.5 + 억양 폭 0.3 + 말 속도 0.2${au.reused ? ' · 저장된 게스트 목소리 재사용' : ''}</p>` : au.reused ? `<p style="font-size:12.5px;margin:8px 0 0">저장된 ${esc(pod.g.field)} 교수 목소리를 다시 불렀다(게스트 릴레이).</p>` : `<p style="font-size:12.5px;margin:8px 0 0;color:var(--ink-2)">이번에는 브라우저 음성으로 미리 들어서 설계·측정 오디션을 건너뛰었다. ElevenLabs 키를 넣으면 설계문으로 후보 3개를 만들고 측정해서 고른다.</p>`}
  ${pod.next ? `<h4 style="margin-top:14px">다음 화 예고 — 게스트 릴레이</h4><p style="margin:0;font-size:13px">B의 레마 “${esc(pod.next.rheme)}” → ${esc(pod.next.section)}면 → <b>${esc(fieldOf(pod.next.section).field)} 교수</b> · “${esc(fieldOf(pod.next.section).lens)}”<br><span style="color:var(--ink-2)">${esc(pod.next.why || '')}</span></p>` : ''}`;
}
$('#rdClose').addEventListener('click', () => playerPause());
