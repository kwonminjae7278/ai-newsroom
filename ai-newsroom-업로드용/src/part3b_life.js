// ───────────── office life: everyone keeps moving and talking at the same time ─────────────
// DUTY = agents the pipeline is directing right now. Everyone else wanders their area, mutters and
// chats with each other. On-duty agents still mutter while they wait (for Claude or for the reader).
let STAGE = -1;
const DUTY = new Set();
function duty(...ids) { DUTY.clear(); ids.forEach(i => DUTY.add(i)); }
function onDuty(...ids) { ids.forEach(i => DUTY.add(i)); }
function offDuty(...ids) { ids.forEach(i => DUTY.delete(i)); }

const AREA = {
  chief: [P(760, 352), P(700, 386), P(822, 378), P(735, 332), P(660, 410)],
  reporter: [P(470, 470), P(540, 448), P(425, 518), P(522, 505), P(598, 470)],
  pd: [P(1000, 350), P(930, 376), P(895, 402), P(965, 396), P(860, 430)],
  artist: [P(1060, 614), P(1000, 598), P(1150, 640), P(900, 600), P(1185, 668)]
};
const SOCIAL = [P(700, 480), P(640, 560), P(782, 540), P(605, 470), P(840, 470), P(720, 600)];

// one-liners per stage (-1 before a run, 0~5 steps, 6 after publishing)
const LINES = {
  '-1': {
    chief: ['오늘은 어떤 기사가 들어올까', '독자 탭 기다리는 중…', '지시서 양식 준비 완료', '바통은 레마로 넘긴다, 잊지 마'],
    reporter: ['칠판 깨끗하게 지워 뒀어요', '테마, 레마… 테마, 레마…', '다른 면 기사도 훑어보는 중', '분필 새로 꺼냈어요'],
    pd: ['요즘 숏츠 반응 보셨어요?', '웹툰체 반응 좋던데', '편성표 정리 중', '팟캐스트 게스트 고민 중…'],
    artist: ['말풍선 4종 세팅 끝', '효과선 브러시 점검 중', '표정 시트 다시 보는 중', '배경 아홉 장 준비됐어요']
  },
  0: { chief: ['들어왔다!'], reporter: ['무슨 기사지?'], pd: ['어느 면이에요?'], artist: ['오, 새 기사!'] },
  1: {
    chief: ['지켜야 할 선부터 적자', '부서별로 한 줄씩…'],
    reporter: ['지시서 기다리는 중', '분필 준비 완료'],
    pd: ['취재부가 먼저겠네', '어느 면 기사예요?', '매체 후보 미리 볼까'],
    artist: ['컷은 4컷이겠지?', '스케치북 펼쳐 둘게요', '레퍼런스 찾아 두는 중']
  },
  2: {
    chief: ['레마가 핵심이야', '칠판 잘 쓰고 있네', '천천히 골라도 돼'],
    reporter: ['어느 바통이든 이어 볼게요', '다른 면으로 넘어가야 해', '노란 줄이 레마예요'],
    pd: ['어떤 바통이 올까', '편성 회의 준비해 둘게요', 'TV 켜 둘까'],
    artist: ['A 기사 분위기 꽤 무겁네', '배경은 시험장이 어울리려나', '표정 시트 넘겨 보는 중']
  },
  3: {
    chief: ['고르는 건 독자야', '점수는 참고만'],
    reporter: ['B 원문 다시 확인 중', '연결 근거 메모해 둘게요'],
    pd: ['웹툰이 제일 높게 나왔네', '숏츠도 나쁘지 않은데'],
    artist: ['웹툰체면 좋겠다', '혹시 숏츠면…?', '펜 잡을 준비 완료']
  },
  4: {
    chief: ['검수 테이블 정리해 둘게', '원문 대조표 준비 중'],
    reporter: ['수치 출처 붙였죠?', '레마가 2컷에 살아야 해'],
    pd: ['썸네일 각 나온다', '4컷 임팩트 기대돼'],
    artist: ['선 정리 중…', '말풍선 위치 조정 중', '톤 맞추는 중']
  },
  5: {
    chief: ['한 컷씩 원문이랑 대조', '인용은 특히 꼼꼼히'],
    reporter: ['통과해라…', '사실 대조면 자신 있어요'],
    pd: ['보도 시간 맞출게요', '두근두근'],
    artist: ['수정 바로 할게요', '재구성 표시 넣었어요']
  },
  6: {
    chief: ['다음 관심 기사 기다린다', '오늘 바통 잘 넘겼어'],
    reporter: ['B 기사로 또 이어 볼까요?', '칠판 지울게요'],
    pd: ['반응 체크해 볼게요', '다음엔 숏츠 편성해요'],
    artist: ['다음엔 숏츠도 그려 보고 싶다', '원화 정리해 둘게요']
  }
};
// two-person small talk; {v} = current card version
const CHATS = {
  '-1': [['오늘 1면 뭐예요?', '독자가 탭해야 알죠!'], ['커피 한 잔?', '좋아요, 라떼로!'], ['레마 찾는 거 재밌어요', '바통 놓치지 마요~'], ['숏츠체는 언제 나와요?', '다음 실험 때요!'], ['어제 웹툰 반응 봤어요?', '댓글 많이 달렸던데요'], ['칠판 지워 놨어요', '고마워요!']],
  run: [['지금 카드 몇 버전이에요?', 'v{v}! 계속 쌓이는 중'], ['취재부 칠판 봤어요?', '노란 줄이 바통이래요'], ['독자가 직접 고른대요', '그게 이 편집국 핵심이지'], ['우리 차례 곧 오겠다', '준비해 둘게요']],
  6: [['수고했어요!', '다음 기사도 가 보죠'], ['B 기사 반응 좋을 듯', '연결이 자연스러웠어요']]
};
const pick = a => a[Math.floor(Math.random() * a.length)];
const lineFor = ag => pick(LINES[STAGE]?.[ag.id] || LINES['-1'][ag.id]);
const isFree = ag => !DUTY.has(ag.id) && !ag.walking && !ag.chatting;
const ambientCount = () => Object.values(A).filter(a => a.sayEl.classList.contains('show') && a.ambientSay).length;
let lastChat = 0;

function nearPoint(ag) {
  const pts = AREA[ag.id].filter(p => Math.hypot((p[0] - ag.x) * 1.79, p[1] - ag.y) > 0.03);
  return pick(pts.length ? pts : AREA[ag.id]);
}
async function chatWith(a, b) {
  a.chatting = b.chatting = true; lastChat = performance.now();
  try {
    const mid = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const spot = SOCIAL.reduce((m, p) => Math.hypot(p[0] - mid[0], p[1] - mid[1]) < Math.hypot(m[0] - mid[0], m[1] - mid[1]) ? p : m, SOCIAL[0]);
    const left = a.x <= b.x;
    const pa = [spot[0] + (left ? -0.026 : 0.026), spot[1] + 0.006], pb = [spot[0] + (left ? 0.026 : -0.026), spot[1] - 0.006];
    const [ok1, ok2] = await Promise.all([a.walkTo(pa, { ambient: true, status: '잡담하러' }), (async () => { await wait(300 + Math.random() * 500); return b.walkTo(pb, { ambient: true, status: '잡담하러' }); })()]);
    if (!ok1 || !ok2 || DUTY.has(a.id) || DUTY.has(b.id)) return;
    a.faceTo(b); b.faceTo(a); a.el.classList.add('chat'); b.el.classList.add('chat');
    const pool = STAGE === -1 ? CHATS['-1'] : STAGE === 6 ? CHATS[6] : CHATS.run;
    const [l1, l2] = pick(pool).map(t => esc(t.replace('{v}', Math.max(0, CARD.ver))));
    a.mutter(l1, 2600); await wait(1100);
    if (DUTY.has(b.id)) return;
    b.mutter(l2, 2400); await wait(2600);
    if (Math.random() < .5 && !DUTY.has(a.id)) { a.mutter(pick(['ㅋㅋ 그러게요', '맞아요', '오 좋네요', '그럼 이따 봐요']), 1500); await wait(1500); }
  } finally {
    a.chatting = b.chatting = false; a.el.classList.remove('chat'); b.el.classList.remove('chat');
    for (const ag of [a, b]) if (!DUTY.has(ag.id)) { const back = nearPoint(ag); setTimeout(() => { if (!DUTY.has(ag.id) && !ag.chatting) ag.walkTo(back, { ambient: true, after: STAGE === -1 || STAGE === 6 ? '대기' : ag.task }); }, 300 + Math.random() * 700); }
  }
}
async function lifeLoop(ag) {
  await sleep(600 + Math.random() * 2400);
  for (;;) {
    await wait(2000 + Math.random() * 3600);
    if (document.hidden || ag.walking || ag.chatting) continue;
    const idle = performance.now() - ag.lastAct;
    if (DUTY.has(ag.id)) {   // directed agents only mutter while they are left waiting
      if (idle > 4200 / SPEED && Math.random() < .42 && ambientCount() < 2) ag.mutter(esc(lineFor(ag)), 2300);
      continue;
    }
    const r = Math.random();
    if (r < .34) await ag.walkTo(nearPoint(ag), { ambient: true });
    else if (r < .62) { if (ambientCount() < 2) ag.mutter(esc(lineFor(ag)), 2300); }
    else if (r < .84 && performance.now() - lastChat > 8000 / SPEED) {
      const mates = Object.values(A).filter(o => o !== ag && isFree(o));
      if (mates.length) await chatWith(ag, pick(mates));
    } else ag.face(Math.random() < .5 ? 'left' : 'right');
  }
}
// keep overlapping bubbles apart: when two talking agents stand close, push the bubbles sideways
function layoutBubbles() {
  const ags = Object.values(A); ags.forEach(a => a.sayEl.classList.remove('sl', 'sr'));
  const vis = ags.filter(a => a.sayEl.classList.contains('show'));
  for (let i = 0; i < vis.length; i++) for (let j = i + 1; j < vis.length; j++) {
    const a = vis[i], b = vis[j];
    if (Math.abs(a.x - b.x) < 0.14 && Math.abs(a.y - b.y) < 0.2) { const [l, r] = a.x <= b.x ? [a, b] : [b, a]; l.sayEl.classList.add('sl'); r.sayEl.classList.add('sr'); }
  }
}
setInterval(layoutBubbles, 120);
Object.values(A).forEach(lifeLoop);
