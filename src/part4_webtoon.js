// ───────────── webtoon asset library (what 제작부 can draw with) ─────────────
const LIB = {
  cast: {
    jobseeker: '20대 남성 취업준비생·수험생, 회색 후드티', worker: '30대 여성 직장인, 블라우스와 사원증',
    official: '50대 남성 공무원·기관 관계자, 정장과 안경', citizen: '60대 여성 시민, 니트 스웨터'
  },
  expr: { neutral: '담담', shock: '놀람', sad: '좌절·슬픔', angry: '분노', worry: '걱정·고민(턱 괴기)' },
  bg: {
    exam: '시험장·교실', office: '사무실', room: '원룸 책상(밤)', street: '도심 거리·횡단보도', briefing: '브리핑룸·기자회견장',
    court: '법정', hospital: '병원 복도', market: '전통시장', subway: '지하철 객실'
  },
  bubbles: { round: '둥근형 · 일상적인 발화', rect: '사각형 · 뒷설명·서술(내레이션)', burst: '방사형 · 강한 반응', wave: '특수형 · 불안·속마음' },
  lines: { none: '선 없음 · 중립', hatch: '사선 빗금 · 압박·불안', radial: '방사형 효과선 · 특정 변화에 주목' },
  pictogram: { won: '₩ 돈 기호 · 비용', sweat: '땀방울 · 압박', question: '물음표 · 미확인 쟁점', exclaim: '느낌표 · 새 사실' },
  narratives: ['일상·공감형', '발견·반전형', '갈등·대립형', '성장·변화형', '성취·카타르시스형']
};
const SRC_LABEL = { A: '기사 A', B: '기사 B', '레마': '레마(연결)' };

function linesSVG(kind) {
  if (!kind || kind === 'none') return '';
  let s = '';
  if (kind === 'radial') {
    for (let i = 0; i < 64; i++) { const a = i / 64 * Math.PI * 2 + (i % 2) * .03, w = .012 + (i % 3) * .006; const r1 = 30 + (i * 37 % 9), r2 = 90;
      const p = (r, d) => `${50 + Math.cos(a + d) * r},${50 + Math.sin(a + d) * r * 1.0}`; s += `<polygon points="${p(r1, 0)} ${p(r2, -w)} ${p(r2, w)}" fill="#111" opacity=".85"/>`; }
  } else if (kind === 'hatch') {
    for (let i = -100; i < 200; i += 2.2) s += `<line x1="${i}" y1="0" x2="${i - 60}" y2="100" stroke="#0b1530" stroke-width=".35" opacity=".45"/>`;
  }
  return `<svg class="wt-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${s}</svg>`;
}
function fxText(t) {
  // concept effect text: characters climb like a staircase
  const chars = [...String(t)]; return chars.map((c, i) => `<span style="font-size:${1 + i * .22}em;transform:translateY(${-i * 8}%)">${esc(c)}</span>`).join('');
}
function emphasize(text, em) {
  let h = esc(text).replace(/\n/g, '<br>');
  if (em) { const e = esc(em); h = h.split(e).join(`<em>${e}</em>`); }
  return h;
}
function renderPanel(cut, idx = 0) {
  const p = el('div', 'wt-panel'); p.dataset.n = cut.n;
  const ratio = cut.img ? cut.ratio : (cut.layout === 'split' ? '16/10' : idx % 2 ? '4/3' : '16/11');
  p.style.aspectRatio = ratio;
  let h = '';
  if (cut.img) h += `<div class="wt-bg" style="background-image:url(${cut.img})"></div>`;
  else if (cut.layout === 'split') {
    const half = (c, tint) => `<div><div class="wt-bg dim" style="background-image:url(assets/bg_${cut.bg || 'room'}.webp);filter:${tint}"></div>${c ? `<img class="wt-char" alt="" src="assets/c_${c.who}_${c.expr || 'neutral'}.webp" style="height:88%;left:50%;transform:translateX(-50%)">` : ''}</div>`;
    h += `<div class="wt-split">${half(cut.cast?.[0], 'saturate(.6) brightness(.85)')}${half(cut.cast?.[1], 'saturate(1.1)')}</div>`;
  } else {
    h += `<div class="wt-bg dim" style="background-image:url(assets/bg_${LIB.bg[cut.bg] ? cut.bg : 'room'}.webp)"></div>`;
  }
  h += linesSVG(cut.lines);
  if (!cut.img && cut.layout !== 'split') for (const c of (cut.cast || []).slice(0, 2)) {
    if (!LIB.cast[c.who]) continue;
    const ht = c.size === 'close' ? 96 : 82; const pos = c.pos === 'right' ? 'right:2%' : c.pos === 'center' ? 'left:50%;transform:translateX(-50%)' : 'left:2%';
    h += `<img class="wt-char" alt="" src="assets/c_${c.who}_${LIB.expr[c.expr] ? c.expr : 'neutral'}.webp" style="height:${ht}%;${pos}">`;
  }
  p.innerHTML = h;
  // caption (사각형 내레이션)
  if (cut.caption) { const c = el('div', 'wt-cap'); c.dataset.f = 'caption'; c.innerHTML = emphasize(cut.caption, cut.emphasis); if (cut.capPos) Object.assign(c.style, cut.capPos); p.append(c); }
  // bubbles
  const who0 = cut.cast?.[0]?.pos || 'left';
  (cut.bubbles || []).forEach((b, i) => {
    const d = el('div', 'wt-b ' + (LIB.bubbles[b.type] ? b.type : 'round')); d.dataset.f = 'bubble'; d.dataset.i = i; d.innerHTML = esc(b.text).replace(/\n/g, '<br>') + (b.invented ? '<span class="redo">재구성 대사</span>' : '');
    if (b.pos) Object.assign(d.style, b.pos);
    else if (cut.layout === 'split') Object.assign(d.style, i === 0 ? { left: '3%', top: '6%', maxWidth: '44%' } : { right: '3%', top: '6%', maxWidth: '44%' });
    else { const top = (cut.caption ? 30 : 6) + i * 26; Object.assign(d.style, who0 === 'right' ? { left: '5%', top: top + '%' } : { right: '5%', top: top + '%' }); }
    p.append(d);
  });
  if (cut.effect_text) { const f = el('div', 'wt-fx'); f.dataset.f = 'fx'; f.innerHTML = fxText(cut.effect_text); Object.assign(f.style, cut.fxPos || { right: '6%', bottom: '14%', fontSize: '11cqw' }); p.append(f); }
  if (cut.pictogram && LIB.pictogram[cut.pictogram]) {
    const g = el('div', 'wt-pic ' + cut.pictogram); g.dataset.f = 'pic'; g.textContent = cut.pictogram === 'won' ? '₩' : cut.pictogram === 'question' ? '?' : cut.pictogram === 'exclaim' ? '!' : '';
    Object.assign(g.style, cut.picPos || (who0 === 'right' ? { right: '30%', top: '30%' } : { left: '30%', top: '30%' })); p.append(g);
  }
  const s = el('div', 'wt-src', `${cut.n}컷 · ${SRC_LABEL[cut.source] || cut.source || ''}`); s.dataset.f = 'cut'; p.append(s);
  if (cut.lines && cut.lines !== 'none' && LIB.lines[cut.lines]) { const lc = el('div', 'wt-linechip', cut.lines === 'radial' ? '방사형 효과선' : '사선 빗금'); lc.dataset.f = 'lines'; p.append(lc); }
  return p;
}
// small, scaled clone for thumbnails on the map / monitor
function panelThumbURL(cut) { return cut.img || `assets/bg_${LIB.bg[cut.bg] ? cut.bg : 'room'}.webp`; }

// ───────────── demo data (서울신문 → 뉴시스). All article text paraphrased; quotes kept short. ─────────────
const DEMO = {
  A: { url: 'https://www.seoul.co.kr/news/newsView.php?id=20261115500021', title: '“AI로 부정행위 했다” 세무사 수석 합격자, 유튜브서 자백', outlet: '서울신문', section: '사회', date: '2026-11-15',
    body: '[요약·재서술] 올해 세무사 시험 수석 합격자가 전자기기와 생성형 AI로 부정행위를 했다고 인정하고 경찰에 자수했다. 공인회계사 1차 시험에서도 같은 방식이었다고 밝혔다. 유튜브 영상에서 실명을 밝히고 사과했으며, 합격 수기·인터뷰에서 거짓 해명을 한 것도 시인했다. 성실하게 준비해 온 수험생들에게 실망과 허탈감을 줬고 시험의 공정성에 대한 신뢰를 훼손했다고 사과했다. 유사 범행을 막기 위해 구체적 수법은 공개하지 않았다. 1차 시험 400점 만점에 397.5점, 세법학개론 전체 평균이 30점대였던 점이 의혹의 배경이 됐다.' },
  order: {
    summary: '올해 세무사 시험 수석 합격자가 AI를 이용한 부정행위를 인정하고 자수했다.',
    orders: { reporter: '기사를 테마와 레마로 나누고, 다른 면으로 넘길 바통(레마) 후보를 세 개 뽑을 것.', pd: '두 기사의 성격을 보고 웹툰체·숏츠체·팟캐스트체 적합도를 매길 것. 고르는 건 독자.', artist: '고른 매체의 표현·서사 특성을 기사 근거와 함께 정해 만들 것(웹툰 4컷 · 팟캐스트 4단계).' },
    guardrails: ['부정행위 수법은 추측해 그리지 않는다(기사도 비공개)', '실존 인물의 얼굴을 특정하지 않는다', '기사 문장은 재서술하고 인용은 짧게', '확정되지 않은 사실은 단정하지 않는다']
  },
  analysis: {
    units: [
      { schema: '제목', text: '세무사 수석 합격자, AI 부정행위 자백', tr: '테마', why: '무엇에 대한 기사인지' },
      { schema: '리드', text: '전자기기·생성형 AI 활용 인정, 경찰에 자수', tr: '테마', why: '사건의 큰 줄기' },
      { schema: '주요 사건', text: '영상에서 실명 밝히고 공개 사과', tr: '테마', why: '사건 경과' },
      { schema: '주요 사건', text: '회계사 1차 시험도 같은 방식이었다고 시인', tr: '테마', why: '같은 사건의 확장' },
      { schema: '배경', text: '1차 397.5점, 과목 평균 30점대와 큰 격차', tr: '테마', why: '의혹이 생긴 배경' },
      { schema: '반응', text: '성실히 준비한 수험생에게 허탈감 줬다며 사죄', tr: '레마', why: '시선이 정직한 수험생에게 옮겨감' },
      { schema: '반응', text: '시험 공정성·전문직 신뢰 훼손 언급', tr: '레마', why: '제도 신뢰라는 새 관점' },
      { schema: '결과·전망', text: '모방 막으려 구체적 수법은 비공개', tr: '레마', why: '재발 방지라는 다음 논점' }
    ],
    theme: '세무사 수석의 AI 부정행위 자백',
    candidates: [
      { rheme: '정직하게 준비한 수험생', why: '피해의 초점이 성실히 준비한 사람들로 옮겨간다. 그들이 치르는 준비 비용은?', section: '경제·금융', query: '취업 학원비 5년새 20%' },
      { rheme: '시험 공정성에 대한 신뢰', why: '개인 일탈을 넘어 국가자격시험 제도의 신뢰 문제로 커진다.', section: '정치·행정', query: '국가자격시험 부정행위 대책' },
      { rheme: '수법 비공개와 재발 방지', why: '같은 일이 반복되지 않으려면 시험장이 무엇을 바꿔야 하나.', section: 'IT·교육', query: '시험장 AI 커닝 방지 대책' }
    ]
  },
  B: { url: 'https://www.newsis.com/view/NISX20251113_0003401797', title: '수능 끝나도 평생 사교육…취업 위한 학원비 5년새 20% 올라', outlet: '뉴시스', section: '금융', date: '2025-11-14',
    body: '[요약·재서술] NH농협은행이 최근 5년(2020~2024) 고객 403만 명의 카드 데이터 2938만 건을 분석한 결과, 교육 관련 소비가 전 연령대에서 늘었다. 자격증·직업훈련 분야 평균 결제단가는 29만 원으로 5년 새 20% 올라 분야 중 상승률이 가장 컸다. 20대의 교육 결제단가 증가율은 8%로 다른 세대 평균(4%)의 두 배였다. 취업 준비와 자기계발이 일상이 되면서 교육비 부담이 커지고 있다는 분석이다.' },
  bAnalysis: {
    summary: '카드 데이터로 본 교육비: 자격증·직업훈련 결제단가가 5년새 20% 올라 가장 큰 폭',
    theme: '시험·취업을 준비하는 데 드는 비용', rheme: '20대 교육 결제단가 증가율이 다른 세대의 2배',
    link: "A의 레마 '정직하게 준비한 수험생'이 B에서는 '준비하는 사람들이 내는 비용'이라는 테마가 된다.",
    facts: ['자격증·직업훈련 평균 결제단가 29만 원, 5년새 20%↑(분야 중 최대)', '20대 교육 결제단가 증가율 8%, 다른 세대 평균 4%의 두 배', '근거: NH농협은행 카드 데이터 2938만 건(2020~2024)']
  },
  searchList: ['수능 끝나도 평생 사교육…취업 위한 학원비 5년새 20% 올라 (뉴시스·금융)', '1인당 사교육비 역대 최고…"물가 상승 감안 시 크게 안 늘어" (뉴시스·교육)', '학령인구 감소에도 사교육 총액 역대급 (아시아경제·경제)'],
  fit: { webtoon: { score: 92, why: '부정한 수석 vs 정직한 수험생, 인물 대비가 뚜렷하다' }, shorts: { score: 74, why: '‘5년새 20%’ 같은 수치 변화는 짧은 화면에 강하다' }, podcast: { score: 81, why: '‘준비 비용’은 금융학의 해석이 붙어야 이어진다' }, pick: 'webtoon' },
  script: {
    narrative: { type: '갈등·대립형', why: '기사 A(AI로 시험을 통과한 수석)와 기사 B(돈과 시간을 들여 정직하게 준비하는 수험생)가 같은 시험을 두 입장에서 보여 준다.' },
    expressive: [
      { feature: '사각형 말풍선', why: '자백 사실과 학원비 수치는 인물의 말이 아니라 뒷설명이라서' },
      { feature: '방사형 말풍선', why: '기사 속 ‘허탈감’이라는 강한 반응을 수험생의 목소리로 옮겨서' },
      { feature: '개념 효과글자 ‘+20%’', why: '확인된 수치 변화를 글자 형상으로 보여 주려고' },
      { feature: '₩ · 땀방울 픽토그램', why: '비용과 부담이 반복되는 개념이라 기호로 고정' },
      { feature: '선 없음 → 사선 빗금', why: '사실 서술은 차분하게, 비용 압박 장면만 빗금으로' }
    ],
    cuts: [
      { n: 1, source: 'A', fact: '수석 합격자가 AI를 이용한 부정행위를 인정하고 자수했다(서울신문).', img: 'assets/demo_1.webp', ratio: '1080/793', lines: 'none',
        caption: '세무사 시험 수석 합격자가\nAI 부정행위를 자백했다.', evidence: 'AI로 부정행위', role: '갈등·대립의 한쪽 — 부정한 방법으로 시험을 통과한 수석. 사건(테마)을 담담하게 연다.',
        why: { caption: '자백했다는 사실은 인물의 말이 아니라 사건 설명이라 사각형 말풍선(내레이션)에 담았다.', lines: '사실을 전하는 첫 컷이라 효과선을 쓰지 않고(선 없음) 중립을 지켰다.' }, prompt: 'Panel 1: a tense national exam hall, a man in a suit seen from behind under a harsh spotlight at a desk, other examinees blurred. Modern Naver webtoon style, no text.' },
      { n: 2, source: '레마', fact: '그는 성실히 준비해 온 수험생들에게 허탈감을 줬다며 사과했다(서울신문).', img: 'assets/demo_2.webp', ratio: '1080/768', lines: 'radial',
        bubbles: [{ type: 'burst', text: '그럼 정직하게\n준비한 우리는?!', invented: true, pos: { left: '3%', top: '5%', maxWidth: '46%' } }], pictogram: 'sweat', picPos: { left: '33%', top: '30%' }, evidence: '허탈감', role: '레마 — 시선이 ‘정직하게 준비한 수험생’에게 옮겨 가며 대립의 다른 쪽이 등장한다.',
        why: { bubbles: ['기사 속 ‘허탈감’이라는 강한 감정 반응을 수험생의 목소리로 옮겨 방사형 말풍선으로. 실제 발언이 아니라 ‘재구성 대사’로 표시했다.'], pic: '당혹과 부담을 땀방울 하나로 요약했다.', lines: '레마가 드러나는 전환점이라 방사형 효과선으로 이 반응에 시선을 모았다.' },
        prompt: 'Panel 2: close-up of the job-seeker (messy black hair, gray hoodie) shocked, looking at phone news, dramatic speed lines. Modern Naver webtoon style, no text.' },
      { n: 3, source: 'B', fact: '취업 준비와 자기계발이 일상이 되며 교육비 부담이 커졌다(뉴시스).', img: 'assets/demo_3.webp', ratio: '1080/815', lines: 'none',
        caption: '정직하게 준비하는 길에도\n값이 붙는다.', pictogram: 'won', picPos: { right: '8%', top: '22%' }, evidence: '교육비 부담', role: '연결 — A의 레마(정직하게 준비한 수험생)가 B의 테마(준비하는 데 드는 비용)가 되는 다리 컷.',
        why: { caption: 'A에서 B로 넘어가는 서술이라 사각형 말풍선. 비용을 묻는 질문으로 다음 컷의 수치를 예고한다.', pic: '‘비용’이라는 개념이 B 전체에 반복돼 ₩ 기호로 고정했다.' },
        prompt: 'Panel 3: the job-seeker at a private academy front desk at night looking at a payment screen, worried, coins and receipts on the counter. Modern Naver webtoon style, no text.' },
      { n: 4, source: 'B', fact: '자격증·직업훈련 평균 결제단가 29만 원, 5년새 20% 상승(뉴시스).', img: 'assets/demo_4.webp', ratio: '1080/623', lines: 'none',
        caption: '자격증·직업훈련 학원비,\n5년새 20% 올랐다.', emphasis: '20%', effect_text: '+20%', fxPos: { right: '5%', top: '6%', fontSize: '10cqw' }, evidence: '20%', role: '대립의 결과 — 정직하게 준비하는 쪽이 치르는 비용이 커졌다는 B의 핵심 사실로 마무리.',
        why: { caption: '수치는 사실 서술이라 사각형 말풍선, 핵심 수치 ‘20%’만 굵은 서체·빨강으로 강조했다.', fx: '확인된 수치 변화(5년새 20%)를 계단처럼 커지는 효과글자로 보여 줬다. 기사에 없는 숫자는 쓰지 않는다.' },
        prompt: 'Panel 4: split composition — left a short stack of receipts, right a much taller stack, the job-seeker sighing between them. Modern Naver webtoon style, no text.' }
    ]
  },
  review: [
    { n: 1, verdict: '통과', check: '사실 대조', issue: '기사 A 제목·리드와 일치' },
    { n: 2, verdict: '수정', check: '인용 대조', issue: '실제 발언이 아님 → ‘재구성 대사’ 표시 확인' },
    { n: 3, verdict: '수정', check: '사실 대조', issue: '원문에 없는 해석(‘값이 붙는다’)', field: 'caption', fixed: '정직하게 준비하는 데\n드는 돈은?' },
    { n: 4, verdict: '통과', check: '사실 대조', issue: '기사 B의 수치(5년새 20%)와 일치' }
  ]
};
