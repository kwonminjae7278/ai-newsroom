// ───────────── utilities ─────────────
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let SPEED = 1;
const wait = ms => new Promise(r => setTimeout(r, ms / SPEED));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const nowT = () => new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

// ───────────── map geometry (normalized to the 2752×1536 map) ─────────────
const P = (x, y) => [x / 1376, y / 768];
const SPOTS = {
  door: P(690, 752), hub: P(700, 480),
  chiefDesk: P(760, 352), reporterHome: P(470, 470), board: P(178, 432),
  pdDesk: P(1000, 350), artistDesk: P(1060, 614), video: P(1185, 668),
  reviewChief: P(425, 585), reviewArtist: P(398, 694), nearReporter: P(530, 470), nearPd: P(930, 372), nearArtist: P(985, 640), nearChief: P(690, 372),
  meetChief: P(662, 418), meetReporter: P(598, 446), boardWatch: P(402, 522), pdMeetR: P(760, 442), pdMeetP: P(822, 430), artistAtPd: P(905, 398),
  corkWatchR: P(902, 472), corkWatchP: P(858, 505), reviewWatchR: P(505, 640), reviewWatchP: P(545, 572)
};
const Q = (x, y) => [x / 2752, y / 1536];
const QUADS = {
  board: [Q(328, 250), Q(788, 65), Q(798, 337), Q(350, 540)],
  tv: [Q(2125, 102), Q(2372, 178), Q(2368, 340), Q(2115, 255)],
  mon: [Q(2298, 757), Q(2518, 852), Q(2512, 1002), Q(2290, 905)],
  cork: [Q(2022, 620), Q(2250, 718), Q(2240, 898), Q(2012, 805)]
};
const ZONES = [['국장실', 600, 128], ['취재부', 540, 560], ['편성부', 905, 250], ['제작부', 905, 568], ['모션 부스', 1268, 735], ['검수 테이블', 250, 742], ['입구', 690, 712]];

const DEPTS = {
  chief: { name: '국장', role: '오케스트레이터 · 최종 검수', hex: '#5B7FCB', cv: 'var(--chief)', walk: 'chief_walk', face: 'chief_front', home: 'chiefDesk', duty: '지시서를 쓰고 부서를 배정한다. 마지막에 원문과 대조해 승인한다.' },
  reporter: { name: '취재부 기자', role: '테마·레마 분석 · 다음 기사 연동', hex: '#D98A3D', cv: 'var(--reporter)', walk: 'reporter_walk', face: 'reporter_front', home: 'reporterHome', duty: '기사를 테마와 레마로 나누고, 레마를 바통 삼아 다른 면의 다음 기사를 찾는다.' },
  pd: { name: '편성부 PD', role: '매체 적합도 · 독자 선택 반영', hex: '#6FA67A', cv: 'var(--pd)', walk: 'pd_walk', face: 'pd_front', home: 'pdDesk', duty: '두 기사에 맞는 매체를 평가한다. 최종 선택은 독자가 한다.' },
  artist: { name: '제작부 작가', role: '표현·서사 선택 · 이미지·모션 생성', hex: '#B07CC6', cv: 'var(--artist)', walk: 'artist_walk', face: 'artist_front', home: 'artistDesk', duty: '표현적·서사적 특성을 기사 근거로 고르고, 컷을 생성해 국장에게 가져간다.' },
  reader: { name: '독자(나)', hex: '#E9C46A', cv: 'var(--human)' }
};

// ───────────── stage, camera, layers ─────────────
const stage = $('#stage');
const cam = el('div'); cam.style.cssText = 'position:absolute;inset:0;transform-origin:0 0;transition:transform 1.1s cubic-bezier(.4,0,.2,1)';
const mapImg = $('.map', stage); const vig = $('.vignette', stage); const layer = $('#layer');
stage.insertBefore(cam, mapImg); cam.append(mapImg, vig, layer);
layer.style.cssText = 'position:absolute;inset:0';
const hud = el('div'); hud.style.cssText = 'position:absolute;inset:0;pointer-events:none'; stage.append(hud);
let camOn = true;
function camera(spot, s = 1.35) {
  if (!camOn || !spot) { cam.style.transform = 'none'; return; }
  const [fx, fy] = Array.isArray(spot) ? spot : SPOTS[spot];
  let tx = 0.5 - fx * s, ty = 0.5 - (fy - 0.06) * s;
  tx = Math.min(0, Math.max(1 - s, tx)); ty = Math.min(0, Math.max(1 - s, ty));
  cam.style.transform = `translate(${tx * 100}%, ${ty * 100}%) scale(${s})`;
}
for (const [t, x, y] of ZONES) { const z = el('div', 'zone', t); z.style.left = x / 13.76 + '%'; z.style.top = y / 7.68 + '%'; layer.append(z); }

// homography → CSS matrix3d
function solve(A, b) {
  const n = b.length; A = A.map((r, i) => [...r, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]];
    for (let r = 0; r < n; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k <= n; k++) A[r][k] -= f * A[c][k]; }
  }
  return A.map((r, i) => r[n] / r[i]);
}
function quadMatrix(w, h, pts) {
  const src = [[0, 0], [w, 0], [w, h], [0, h]], A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = src[i], [u, v] = pts[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  const H = solve(A, b);
  return `matrix3d(${H[0]},${H[3]},0,${H[6]},${H[1]},${H[4]},0,${H[7]},0,0,1,0,${H[2]},${H[5]},0,1)`;
}
const surfaces = {};
function makeSurface(key, cls, w, h) { const s = el('div', 'surface ' + cls); s.style.width = w + 'px'; s.style.height = h + 'px'; s.dataset.w = w; s.dataset.h = h; s.dataset.q = key; layer.append(s); surfaces[key] = s; return s; }
function placeSurfaces() {
  const W = stage.clientWidth, H = stage.clientHeight;
  for (const s of Object.values(surfaces)) { const pts = QUADS[s.dataset.q].map(([x, y]) => [x * W, y * H]); s.style.transform = quadMatrix(+s.dataset.w, +s.dataset.h, pts); }
}
const boardS = makeSurface('board', 'board', 920, 600);
const tvS = makeSurface('tv', 'screen tv', 520, 330);
const monS = makeSurface('mon', 'screen mon', 460, 310);
const corkS = makeSurface('cork', 'cork', 480, 380);
new ResizeObserver(placeSurfaces).observe(stage);

// ───────────── HUD close-ups (readable versions of board / screens) ─────────────
function float(cls, css) { const f = el('div', 'float ' + (cls || '')); Object.assign(f.style, css); hud.append(f); return f; }
const chalk = float('chalkclose', { right: '1.5%', top: '2.5%', width: '47cqw', background: '#2E4A3E', color: '#F2F1E6', border: '.9cqw solid #6B4426', borderRadius: '.6cqw', boxShadow: '0 18px 40px rgba(0,0,0,.5), inset 0 0 40px rgba(0,0,0,.35)', fontFamily: 'var(--f-chalk)', padding: '1.1cqw 1.5cqw 1.4cqw', maxWidth: 'none' });
const tvClose = float('', { left: '1.5%', top: '2.5%', width: '34cqw', background: '#0F1622', color: '#DDE8FF', maxWidth: 'none' });
const monClose = float('', { left: '1.5%', top: '3%', width: '36cqw', background: '#0F1622', color: '#DDE8FF', maxWidth: 'none' });
const reviewClose = float('', { right: '1.5%', bottom: '3%', width: '44cqw', maxWidth: 'none' });
const motionClose = float('motion', { left: '1.5%', bottom: '3%', background: '#151515', color: '#fff' });
function show(f, on = true) { f.classList.toggle('show', on); }

// ───────────── walkable floor (1376×768 px) ─────────────
const OBST = [
  [[200, 400], [560, 238], [632, 345], [268, 498]],               // 취재부 책상 두 개
  [[618, 70], [642, 70], [642, 352], [618, 352]],                 // 국장실 왼쪽 벽
  [[655, 170], [862, 140], [890, 230], [742, 300], [660, 272]],   // 국장 책상
  [[935, 195], [1235, 255], [1240, 330], [1000, 310]],            // 편성부 책상
  [[995, 275], [1315, 405], [1315, 440], [995, 310]],             // 편성·제작 칸막이
  [[955, 445], [1045, 425], [1265, 535], [1255, 615], [1100, 590], [962, 528]], // 제작부 작업대
  [[135, 565], [250, 532], [365, 566], [378, 655], [250, 722], [128, 670]],     // 검수 원탁
  [[935, 655], [1135, 655], [1135, 768], [935, 768]],             // 모션 부스 모니터
  [[1195, 600], [1376, 600], [1376, 768], [1195, 768]]            // 카메라 삼각대
];
const NODES = [[560, 450], [470, 525], [395, 520], [150, 470], [288, 518], [205, 505], [700, 420], [700, 520], [850, 425], [880, 560], [620, 615], [800, 640], [895, 385], [1180, 668], [430, 600], [760, 360]];
function segX(p, q, a, b) {
  const d = (u, v, w) => (w[0] - u[0]) * (v[1] - u[1]) - (w[1] - u[1]) * (v[0] - u[0]);
  const d1 = d(a, b, p), d2 = d(a, b, q), d3 = d(p, q, a), d4 = d(p, q, b);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
}
function inPoly([x, y], poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function clearSeg(p, q) {
  for (const o of OBST) {
    if (inPoly(p, o) || inPoly(q, o)) continue;
    for (let i = 0; i < o.length; i++) if (segX(p, q, o[i], o[(i + 1) % o.length])) return false;
    if (inPoly([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], o)) return false;
  }
  return true;
}
function route(p, q) {   // px → list of px waypoints (excluding p)
  if (clearSeg(p, q)) return [q];
  const N = [p, ...NODES, q], n = N.length, dist = Array(n).fill(Infinity), prev = Array(n).fill(-1), done = Array(n).fill(false);
  const len = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  dist[0] = 0;
  for (;;) {
    let u = -1; for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity) break; done[u] = true; if (u === n - 1) break;
    for (let v = 0; v < n; v++) if (!done[v] && v !== u) { const w = dist[u] + len(N[u], N[v]); if (w < dist[v] && clearSeg(N[u], N[v])) { dist[v] = w; prev[v] = u; } }
  }
  if (prev[n - 1] < 0) return [q];
  const out = []; for (let v = n - 1; v > 0; v = prev[v]) out.unshift(N[v]); return out;
}
const toPx = ([x, y]) => [x * 1376, y * 768];
const spotOf = s => Array.isArray(s) ? s : SPOTS[s];

// ───────────── agents ─────────────
class Agent {
  constructor(id) {
    this.id = id; const d = DEPTS[id]; this.d = d;
    const e = this.el = el('div', 'agent'); e.style.setProperty('--c', d.hex);
    e.style.setProperty('--ph', (Math.random() * 2).toFixed(2) + 's');
    e.innerHTML = `<div class="shadow"></div><div class="body"><div class="fig"><img alt="${esc(d.name)}" src="assets/${d.walk}.webp"></div></div>
      <div class="tag"><span class="stat"></span><span class="name">${esc(d.name)}</span></div><div class="say"></div><div class="carry"></div>`;
    this.sayEl = $('.say', e); this.statEl = $('.stat', e); this.carryEl = $('.carry', e);
    this.mtok = 0; this.stok = 0; this.lastAct = 0; this.ambientSay = false; this.walking = false;
    layer.append(e); this.place(d.home); this.status('대기');
    e.addEventListener('click', ev => { ev.stopPropagation(); openPop(this); });
    this.task = '대기 중'; this.last = '';
  }
  touch() { this.lastAct = performance.now(); }
  setPos(x, y) { this.x = x; this.y = y; Object.assign(this.el.style, { left: x * 100 + '%', top: y * 100 + '%', zIndex: Math.round(y * 1000) }); }
  place(spot) { this.mtok++; this.walking = false; this.el.classList.remove('walking'); const [x, y] = spotOf(spot); this.setPos(x, y); }
  face(dir) { this.el.classList.toggle('left', dir === 'left'); }
  faceTo(o) { if (o && Math.abs(o.x - this.x) > 0.004) this.face(o.x < this.x ? 'left' : 'right'); }
  stop() { this.mtok++; }
  // walks along a routed path around desks; a newer walk (or stop/place) cancels this one
  async walkTo(spot, opts = {}) {
    if (!opts.ambient) this.touch();
    const tok = ++this.mtok; const tgt = spotOf(spot);
    const pts = [[this.x, this.y], ...route(toPx([this.x, this.y]), toPx(tgt)).map(([x, y]) => [x / 1376, y / 768])];
    pts[pts.length - 1] = tgt;
    const segs = []; let L = 0;
    for (let i = 1; i < pts.length; i++) { const l = Math.hypot((pts[i][0] - pts[i - 1][0]) * 1.79, pts[i][1] - pts[i - 1][1]); segs.push([pts[i - 1], pts[i], L, l]); L += l; }
    if (L < 0.004) { if (opts.face) this.face(opts.face); return true; }
    const prev = this.statEl.textContent; if (opts.status) this.status(opts.status, true); else if (!opts.ambient) this.status('이동 중', true);
    this.el.classList.add('walking'); this.walking = true;
    const pace = opts.pace || 1; const dur = Math.max(600, L * 3000 / pace) / SPEED, t0 = performance.now();
    const ok = await new Promise(res => {
      const step = t => {
        if (tok !== this.mtok) return res(false);
        const k = Math.min(1, (t - t0) / dur); const e = -(Math.cos(Math.PI * k) - 1) / 2; const s = e * L;
        const sg = segs.find(g => s <= g[2] + g[3] + 1e-9) || segs[segs.length - 1];
        const f = sg[3] ? (s - sg[2]) / sg[3] : 1; const [a, b] = sg;
        if (Math.abs(b[0] - a[0]) > 0.002) this.face(b[0] < a[0] ? 'left' : 'right');
        this.setPos(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f);
        k < 1 ? requestAnimationFrame(step) : res(true);
      };
      requestAnimationFrame(step);
    });
    if (tok === this.mtok) { this.el.classList.remove('walking'); this.walking = false; if (opts.face) this.face(opts.face); if (opts.after) this.status(opts.after); else if (!opts.ambient && !opts.status) this.status(prev); else if (opts.status) this.status(prev); }
    return ok;
  }
  status(t, busy = false) { this.statEl.textContent = t; this.statEl.classList.toggle('busy', busy); this.task = t; }
  // speech: each bubble has a token, so an earlier timer never hides a later line
  bubble(html, ms, ambient) {
    const tok = ++this.stok; this.sayEl.innerHTML = html; this.sayEl.classList.add('show'); this.sayEl.classList.toggle('amb', !!ambient); this.ambientSay = !!ambient;
    this.el.classList.remove('talking'); void this.el.offsetWidth; this.el.classList.add('talking');
    if (!ambient) { this.last = this.sayEl.textContent; this.touch(); }
    return tok;
  }
  async say(html, ms = 2600, keep = false) {
    const tok = this.bubble(html, ms, false);
    if (!keep) { await wait(ms); if (tok === this.stok) this.sayEl.classList.remove('show'); }
  }
  sayNow(html, ms = 2400) { this.say(html, ms); }   // fire and forget
  async mutter(html, ms = 2200) { if (this.sayEl.classList.contains('show')) return; const tok = this.bubble(html, ms, true); await wait(ms); if (tok === this.stok) this.sayEl.classList.remove('show'); }
  think(label = '생각 중') { this.bubble(`<b>${esc(label)}</b> <span class="dots"><i></i><i></i><i></i></span>`, 0, false); this.status(label, true); }
  hush() { this.stok++; this.sayEl.classList.remove('show'); }
  carry(node) { this.carryEl.innerHTML = ''; if (node) this.carryEl.append(node); }
}
const A = { chief: new Agent('chief'), reporter: new Agent('reporter'), pd: new Agent('pd'), artist: new Agent('artist') };
A.chief.face('left'); A.reporter.face('left'); A.pd.face('left'); A.artist.face('right');
function ctxChip(v, dept = 'chief') { const c = el('div', 'ctx-chip'); c.style.setProperty('--c', DEPTS[dept].hex); c.innerHTML = `<span>CTX</span><i></i><i></i><i></i><b>v${v}</b>`; return c; }
function thumbsNode(urls) { const t = el('div', 'thumbs'); urls.slice(0, 3).forEach(u => { const d = el('div'); d.style.backgroundImage = `url(${u})`; t.append(d); }); return t; }
async function handoff(from, to, node, line, reply) {
  from.faceTo(to); to.faceTo(from);
  if (line) { from.sayNow(line, 2300); await wait(900); }
  if (reply) to.sayNow(reply, 2000);
  await wait(reply ? 700 : 1000);
  from.carry(null); to.carry(node);
  logit(from.id, `${DEPTS[to.id].name}에게 컨텍스트 카드를 넘김`, null, true);
  await wait(reply ? 900 : 300);
}
// several people talking at once: [[agent, html, startMs, durMs]]
async function talk(lines) {
  await Promise.all(lines.map(async ([ag, html, at = 0, ms = 2200]) => { if (at) await wait(at); await ag.say(html, ms); }));
}

// popover
const pop = $('#pop');
function openPop(ag) {
  const d = ag.d; const r = ag.el.getBoundingClientRect(); const sr = stage.getBoundingClientRect();
  pop.innerHTML = `<div class="ph"><img src="assets/${d.face}.webp" alt=""><div><b>${esc(d.name)}</b><div style="color:var(--ink-3);font-size:12px">${esc(d.role)}</div></div></div>
   <div class="st"><b>지금:</b> ${esc(ag.task)}</div><div class="st"><b>맡은 일:</b> ${esc(d.duty)}</div>${ag.last ? `<div class="st"><b>최근 보고:</b> ${esc(clip(ag.last, 90))}</div>` : ''}
   <div class="st"><b>들고 있는 것:</b> ${ag.carryEl.children.length ? esc(ag.carryEl.textContent.replace(/\s+/g, ' ').trim() || '생성 이미지') : '없음'}</div>`;
  pop.style.left = Math.min(window.innerWidth - 280, r.left + r.width / 2 - 130) + window.scrollX + 'px';
  pop.style.top = Math.max(8, r.top - 10 + window.scrollY) + 'px';
  pop.style.transform = 'translateY(-100%)'; pop.classList.add('show');
}
document.addEventListener('click', () => pop.classList.remove('show'));

// flying newspaper (the tapped article)
async function flyPaper(title, from = 'door', to = 'chiefDesk') {
  const p = el('div', 'paper-fly'); p.innerHTML = `<b>${esc(clip(title, 26))}</b><i></i><i></i><i style="width:70%"></i>`;
  layer.append(p); const [x0, y0] = SPOTS[from], [x1, y1] = SPOTS[to]; const dur = 1400 / SPEED, t0 = performance.now();
  await new Promise(res => { const st = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); p.style.left = (x0 + (x1 - x0) * e) * 100 + '%'; p.style.top = (y0 + (y1 - y0) * e - Math.sin(k * Math.PI) * .18 - .1) * 100 + '%'; k < 1 ? requestAnimationFrame(st) : res(); }; requestAnimationFrame(st); });
  p.remove();
}

// ───────────── context card model ─────────────
const VER = [
  { v: 0, dept: 'chief', t: '국장 · 지시서' }, { v: 1, dept: 'reporter', t: '취재부 · 테마/레마 → 다음 기사' }, { v: 2, dept: 'pd', t: '편성부 · 매체 선택' },
  { v: 3, dept: 'artist', t: '제작부 · 표현/서사 · 컷 대본' }, { v: 4, dept: 'artist', t: '제작부 · 이미지·모션 생성' }, { v: 5, dept: 'chief', t: '국장 · 원문 대조 검수' }, { v: 6, dept: 'chief', t: '보도' }
];
const CARD = { ver: -1, fields: [], holder: null };
function cardReset() { CARD.ver = -1; CARD.fields = []; CARD.holder = null; renderCard(); }
function cardAdd(v, label, value, opt = {}) { const f = { v, label, value, ...opt, id: Math.random().toString(36).slice(2), fresh: true }; CARD.fields.push(f); CARD.ver = Math.max(CARD.ver, v); renderCard(); return f; }
function cardSet(f, value) { f.value = value; f.fresh = true; renderCard(); }
function cardHold(dept) { CARD.holder = dept; renderCard(); }
function sizeOf(f) { return typeof f.value === 'string' ? f.value.length : f.value?.text ? f.value.text.length : 40; }
function renderCard() {
  const paper = $('#paper'); const stamp = $('#stamp');
  $('#cardTitle').textContent = CARD.ver < 0 ? '컨텍스트 카드' : `컨텍스트 카드 v${CARD.ver}`;
  $('#cardSub').textContent = CARD.ver < 0 ? '기사를 넣으면 부서마다 컨텍스트가 쌓여요' : `필드 ${CARD.fields.length}개 · ${CARD.fields.reduce((a, f) => a + sizeOf(f), 0).toLocaleString()}자 · 사람 개입 ${CARD.fields.filter(f => f.hitl).length}회`;
  const h = $('#holder'); const hd = CARD.holder ? DEPTS[CARD.holder] : null; h.style.setProperty('--hc', hd ? hd.hex : '#777'); h.innerHTML = `<i></i>${hd ? esc(hd.name) + '가 들고 있음' : '보관함'}`;
  // version bars: cumulative chars
  const vb = $('#vbar'); vb.innerHTML = ''; let cum = 0; const tot = Math.max(1, CARD.fields.reduce((a, f) => a + sizeOf(f), 0));
  VER.forEach(({ v }) => { cum += CARD.fields.filter(f => f.v === v).reduce((a, f) => a + sizeOf(f), 0); const d = el('div'); d.style.height = (CARD.ver >= v ? Math.max(6, cum / tot * 100) : 4) + '%'; if (v === CARD.ver) d.classList.add('on'); if (CARD.ver >= v) { const s = el('span', null, cum >= 1000 ? (cum / 1000).toFixed(1) + 'k' : String(cum)); d.append(s); } vb.append(d); });
  if (!CARD.fields.length) { paper.innerHTML = ''; paper.append(stamp); stamp.hidden = true; paper.insertAdjacentHTML('beforeend', '<div class="empty">아직 들어온 기사가 없어요. 아래에 기사 링크를 넣거나 데모를 실행해 보세요.</div>'); return; }
  paper.innerHTML = ''; paper.append(stamp); stamp.hidden = CARD.ver < 6;
  for (const { v, dept, t } of VER) {
    const fs = CARD.fields.filter(f => f.v === v); if (!fs.length) continue;
    const g = el('div', 'grp'); g.style.setProperty('--gc', DEPTS[dept].hex);
    g.innerHTML = `<h4><em>v${v}</em>${esc(t)}</h4>`;
    for (const f of fs) {
      const r = el('div', 'fld' + (f.fresh ? ' new' : '')); f.fresh = false;
      const k = el('div', 'k', f.label); const val = el('div', 'val');
      if (typeof f.value === 'string') val.textContent = f.value; else if (f.value?.thumbs) { const th = el('div', 'th'); f.value.thumbs.forEach(u => { const d = el('div'); d.style.backgroundImage = `url(${u})`; th.append(d); }); if (f.value.text) val.append(document.createTextNode(f.value.text)); val.append(th); } else if (f.value?.text) val.textContent = f.value.text;
      if (f.hitl) val.insertAdjacentHTML('beforeend', '<span class="hitl">사람이 선택</span>');
      r.append(k, val); g.append(r);
    }
    paper.append(g);
  }
  if ($('#pane-card').scrollHeight > $('#pane-card').clientHeight) $('#pane-card').scrollTop = $('#pane-card').scrollHeight;
}

// ───────────── log ─────────────
const RUNLOG = [];
function logit(dept, text, tool, quiet) {
  RUNLOG.push({ t: new Date().toISOString(), dept, text, tool });
  const it = el('div', 'it'); const d = DEPTS[dept] || { name: dept, hex: '#aaa' }; it.style.setProperty('--lc', d.hex);
  it.innerHTML = `<span class="who">${esc(d.name)}</span><span>${tool ? `<span class="tool">${esc(tool)}</span>` : ''}${esc(text)}</span><time>${nowT()}</time>`;
  $('#log').prepend(it);
}

// ───────────── steps / tabs / toast / speed ─────────────
const STEPS = ['관심 기사 탭', '국장 지시', '레마로 다음 기사', '매체 선택', '매체 제작', '검수 · 보도'];
$('#steps').innerHTML = STEPS.map((s, i) => `<span class="step" data-i="${i}"><b>${i + 1}</b>${s}</span>`).join('');
function stepLabel(i, t) { const s = document.querySelector(`.step[data-i="${i}"]`); if (s) s.lastChild.textContent = t; }
function setStep(i) { STAGE = i; document.querySelectorAll('.step').forEach((s, k) => { s.classList.toggle('on', k === i); s.classList.toggle('done', k < i); }); }
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  ['card', 'log', 'src', 'team'].forEach(t => $('#pane-' + t).hidden = t !== b.dataset.tab);
}));
document.querySelectorAll('.speed button').forEach(b => b.addEventListener('click', () => { SPEED = +b.dataset.sp; document.querySelectorAll('.speed button').forEach(x => x.classList.toggle('on', x === b)); }));
let toastT; function toast(msg, ms = 5000) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
$('#team').innerHTML = ['chief', 'reporter', 'pd', 'artist'].map(k => { const d = DEPTS[k]; return `<div class="mate"><img src="assets/${d.face}.webp" alt=""><div><b style="color:${d.hex}">${d.name}</b><p>${esc(d.role)}</p><p>${esc(d.duty)}</p></div></div>`; }).join('') +
  `<div class="mate"><div style="width:44px;height:44px;border-radius:50%;background:var(--human);display:grid;place-items:center;color:#2a1f0e;font-weight:800">나</div><div><b style="color:var(--human)">독자(사람)</b><p>관심 기사를 탭하고, 레마와 매체를 고르고, 검수에 의견을 남긴다.</p></div></div>`;

// ───────────── decision dock (human in the loop) ─────────────
function decide({ title, text, choices = [], textarea, inputs = [], submit }) {
  return new Promise(res => {
    const box = $('#dockDecide'); $('#dockInput').hidden = true; box.hidden = false; box.innerHTML = '';
    box.insertAdjacentHTML('beforeend', `<h3><span class="who">독자의 차례</span>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}`);
    const done = v => { box.hidden = true; $('#dockInput').hidden = false; res(v); };
    if (choices.length) {
      const g = el('div', 'choices');
      choices.forEach(c => { const b = el('button', 'choice'); b.type = 'button'; if (c.disabled) b.disabled = true; b.innerHTML = `${c.rec ? '<span class="rec">편성부 추천</span>' : ''}<b>${esc(c.label)}</b>${c.desc ? `<span>${esc(c.desc)}</span>` : ''}${c.small ? `<small>${esc(c.small)}</small>` : ''}`; b.addEventListener('click', () => done({ value: c.value })); g.append(b); });
      box.append(g);
    }
    const vals = {};
    inputs.forEach(inp => { const i = el('input'); i.type = 'text'; i.placeholder = inp.placeholder || ''; i.id = 'in-' + inp.key; i.style.cssText = 'width:100%;margin:8px 0 0;background:var(--chrome);border:1px solid var(--line);border-radius:8px;padding:10px;color:var(--ink);font:inherit'; vals[inp.key] = i; box.append(i); });
    let ta; if (textarea) { ta = el('textarea'); ta.id = 'decideText'; ta.placeholder = textarea.placeholder || ''; ta.style.marginTop = '8px'; box.append(ta); }
    if (submit) {
      const row = el('div', 'inrow'); row.style.marginTop = '8px';
      submit.forEach(s => { const b = el('button', 'btn' + (s.ghost ? ' ghost' : ''), s.label); b.type = 'button'; b.addEventListener('click', () => done({ value: s.value, text: ta ? ta.value.trim() : '', inputs: Object.fromEntries(Object.entries(vals).map(([k, i]) => [k, i.value.trim()])) })); row.append(b); });
      box.append(row);
    }
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}
