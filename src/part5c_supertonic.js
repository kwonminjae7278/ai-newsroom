// ───────────── Supertonic 3 (Supertone) — 키 없이 브라우저에서 도는 한국어 음성 합성 ─────────────
// 모델: huggingface.co/supertone-oss-archive/supertonic-3 (OpenRAIL-M) · 추론 코드: supertone-inc/supertonic web 예제(MIT)를 옮겨 씀
// onnxruntime-web으로 브라우저 안에서 실행한다. 처음 한 번 모델(약 400MB)을 받고, 이후에는 브라우저 캐시에서 읽는다.
const ST = {
  ortVer: '1.20.1',
  rev: 'aafc6e32416a594460b32413efc49d7fe4ce6d46',
  get base() { return `https://huggingface.co/supertone-oss-archive/supertonic-3/resolve/${this.rev}/`; },
  female: ['F1', 'F2', 'F3', 'F4', 'F5'], male: ['M1', 'M2', 'M3', 'M4', 'M5'],
  tts: null, cfg: null, indexer: null, styles: {}, ep: null,
  loadScript(src) { return new Promise((res, rej) => { if ([...document.scripts].some(s => s.src === src)) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('스크립트를 불러오지 못함: ' + src)); document.head.append(s); }); },
  async getBuf(path, onProg) {
    const url = this.base + path; let cache = null;
    try { cache = await caches.open('supertonic-3-' + this.rev.slice(0, 8)); const hit = await cache.match(url); if (hit) { onProg?.(1, 1, true); return await hit.arrayBuffer(); } } catch { cache = null; }
    const r = await fetch(url); if (!r.ok) throw new Error(`모델 파일을 받지 못함 (${r.status}) ${path}`);
    const total = +r.headers.get('content-length') || 0; const rd = r.body.getReader(); const parts = []; let got = 0;
    for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; onProg?.(got, total); }
    const buf = new Uint8Array(got); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
    try { await cache?.put(url, new Response(buf, { headers: { 'Content-Type': 'application/octet-stream' } })); } catch { }
    return buf.buffer;
  },
  async load(onProg) {
    if (this.tts) return;
    await this.loadScript(`https://cdn.jsdelivr.net/npm/onnxruntime-web@${this.ortVer}/dist/ort.webgpu.min.js`);
    ort.env.wasm.wasmPaths = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${this.ortVer}/dist/`;
    ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 2) : 1; ort.env.wasm.proxy = false;
    this.cfg = JSON.parse(new TextDecoder().decode(await this.getBuf('onnx/tts.json')));
    this.indexer = JSON.parse(new TextDecoder().decode(await this.getBuf('onnx/unicode_indexer.json')));
    const files = [['dp', 'duration_predictor', 3.7], ['te', 'text_encoder', 36.4], ['ve', 'vector_estimator', 256.5], ['vo', 'vocoder', 101.4]];
    const totalMB = files.reduce((a, f) => a + f[2], 0); let doneMB = 0;
    const tryEP = async (buf, eps) => { for (const ep of eps) { try { const s = await ort.InferenceSession.create(buf, { executionProviders: [ep], graphOptimizationLevel: 'all' }); this.ep = this.ep || ep; return s; } catch (e) { console.warn('EP 실패', ep, e); } } throw new Error('이 브라우저에서 모델을 실행할 수 없어요'); };
    const eps = ['wasm'];   // WebGPU 백엔드는 이 모델에서 거의 무음을 내서(직접 확인) CPU(WASM)로만 돌린다
    const S = {};
    for (const [k, f, mb] of files) {
      const buf = await this.getBuf(`onnx/${f}.onnx`, (g, t, cached) => onProg?.({ file: f, frac: (doneMB + (cached ? mb : (t ? g / t : 0) * mb)) / totalMB, cached }));
      doneMB += mb; onProg?.({ file: f, frac: doneMB / totalMB, stage: 'session' });
      S[k] = await tryEP(new Uint8Array(buf), eps);
    }
    this.tts = S;
  },
  async style(name) {
    if (this.styles[name]) return this.styles[name];
    const j = JSON.parse(new TextDecoder().decode(await this.getBuf(`voice_styles/${name}.json`)));
    const t = (o) => new ort.Tensor('float32', Float32Array.from(o.data.flat(Infinity)), o.dims);
    return (this.styles[name] = { ttl: t(j.style_ttl), dp: t(j.style_dp) });
  },
  prep(text) {
    text = koSpeak(text).normalize('NFKD');
    const rep = { '–': '-', '‑': '-', '—': '-', '_': ' ', '“': '"', '”': '"', '‘': "'", '’': "'", '´': "'", '`': "'", '[': ' ', ']': ' ', '|': ' ', '/': ' ', '#': ' ', '→': ' ', '←': ' ', '·': ', ' };
    for (const [k, v] of Object.entries(rep)) text = text.replaceAll(k, v);
    text = text.replace(/[♥☆♡©\\]/g, '').replace(/ ([,.!?;:'])/g, '$1').replace(/\s+/g, ' ').trim();
    if (!/[.!?;:,'"')\]}…。」』】〉》›»]$/.test(text)) text += '.';
    return `<ko>${text}</ko>`;
  },
  async synth(text, voice, opt = {}) {   // 한 번의 실행이 멈추는 경우가 있어(직접 확인) 90초가 넘으면 세션을 새로 열고 한 번 더 시도
    for (let k = 0; k < 2; k++) {
      let timer; const r = await Promise.race([this._synth(text, voice, opt), new Promise(res => { timer = setTimeout(() => res(null), 90000); })]); clearTimeout(timer);
      if (r) return r;
      console.warn('Supertonic 실행이 멈춰 세션을 다시 엽니다'); this.tts = null; await this.load(() => { });
    }
    throw new Error('음성 합성이 응답하지 않아요');
  },
  async _synth(text, voice, { speed = 1.05, steps = 8 } = {}) {
    const S = this.tts, cfg = this.cfg, st = await this.style(voice);
    const chunks = chunkKo(text, 120); const outs = [];
    for (const ch of chunks) {
      const p = this.prep(ch); const ids = new BigInt64Array(p.length); let n = 0;
      for (const c of p) { const cp = c.codePointAt(0); ids[n++] = BigInt(cp < this.indexer.length ? this.indexer[cp] : -1); }
      const L = n; const idsT = new ort.Tensor('int64', ids.slice(0, L), [1, L]); const maskT = new ort.Tensor('float32', new Float32Array(L).fill(1), [1, 1, L]);
      const dur = (await S.dp.run({ text_ids: idsT, style_dp: st.dp, text_mask: maskT })).duration.data[0] / speed;
      const emb = (await S.te.run({ text_ids: idsT, style_ttl: st.ttl, text_mask: maskT })).text_emb;
      const sr = cfg.ae.sample_rate, chunk = cfg.ae.base_chunk_size * cfg.ttl.chunk_compress_factor, D = cfg.ttl.latent_dim * cfg.ttl.chunk_compress_factor;
      const wavLen = Math.floor(dur * sr), T = Math.floor((wavLen + chunk - 1) / chunk);
      let xt = new Float32Array(D * T); for (let i = 0; i < xt.length; i++) { const u1 = Math.max(1e-4, Math.random()), u2 = Math.random(); xt[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); }
      const lmT = new ort.Tensor('float32', new Float32Array(T).fill(1), [1, 1, T]); const tot = new ort.Tensor('float32', new Float32Array([steps]), [1]);
      for (let s = 0; s < steps; s++) {
        const o = await S.ve.run({ noisy_latent: new ort.Tensor('float32', xt, [1, D, T]), text_emb: emb, style_ttl: st.ttl, latent_mask: lmT, text_mask: maskT, current_step: new ort.Tensor('float32', new Float32Array([s]), [1]), total_step: tot });
        xt = Float32Array.from(o.denoised_latent.data);
      }
      const wav = (await S.vo.run({ latent: new ort.Tensor('float32', xt, [1, D, T]) })).wav_tts.data;
      outs.push(Float32Array.from(wav.subarray ? wav.subarray(0, Math.min(wav.length, wavLen)) : wav.slice(0, wavLen)));
    }
    return { wav: concatPCM(outs, Math.floor(0.25 * this.cfg.ae.sample_rate)), sr: this.cfg.ae.sample_rate };
  }
};
function concatPCM(parts, gap = 0) { const n = parts.reduce((a, p) => a + p.length, 0) + gap * Math.max(0, parts.length - 1); const o = new Float32Array(n); let k = 0; parts.forEach((p, i) => { o.set(p, k); k += p.length + (i < parts.length - 1 ? gap : 0); }); return o; }
function chunkKo(text, max = 120) { const s = String(text).split(/(?<=[.!?…])\s+/); const out = []; let cur = ''; for (const x of s) { if ((cur + ' ' + x).trim().length <= max) cur = (cur ? cur + ' ' : '') + x; else { if (cur) out.push(cur); cur = x; } } if (cur) out.push(cur); return out.length ? out : [String(text)]; }
function pcmToWav(pcm, sr) {
  const b = new ArrayBuffer(44 + pcm.length * 2), v = new DataView(b), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + pcm.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, pcm.length * 2, true);
  for (let i = 0; i < pcm.length; i++) v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, pcm[i])) * 32767, true);
  return new Blob([b], { type: 'audio/wav' });
}
function resamplePCM(pcm, from, to) { if (from === to) return pcm; const r = from / to, n = Math.floor(pcm.length / r), o = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i * r, k = Math.floor(x), f = x - k; o[i] = (pcm[k] || 0) * (1 - f) + (pcm[k + 1] || 0) * f; } return o; }

// ───────────── 한국어 읽기 정규화: 숫자·기호를 소리 나는 대로 ─────────────
function sinoKo(n) {
  n = Math.floor(+n); if (!isFinite(n)) return ''; if (n === 0) return '영';
  const d = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구'], u = ['', '십', '백', '천'], big = ['', '만', '억', '조'];
  let out = '', g = 0;
  while (n > 0) { const part = n % 10000; n = Math.floor(n / 10000); if (part) { let s = ''; String(part).padStart(4, '0').split('').forEach((c, i) => { const k = +c, pos = 3 - i; if (!k) return; s += (k === 1 && pos > 0 ? '' : d[k]) + u[pos]; }); out = s + big[g] + out; } g++; }
  return out;
}
function koSpeak(t) {
  return String(t)
    .replace(/\bAI\b/g, '에이아이').replace(/\bSNS\b/g, '에스엔에스')
    .replace(/(\d+(?:\.\d+)?)\s*%/g, (_, x) => (x.includes('.') ? sinoKo(x.split('.')[0]) + '점' + x.split('.')[1].split('').map(c => sinoKo(c)).join('') : sinoKo(x)) + ' 퍼센트')
    .replace(/(\d+)\s*(배|명|개|살|시간|시|곳|번째|가지)/g, (m, x, c) => { const n = +x; const nat = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열']; return (n <= 10 && ['배', '명', '개', '살', '시간', '시', '곳', '가지'].includes(c) ? nat[n] : sinoKo(n)) + ' ' + c; })
    .replace(/(\d+)\.(\d+)/g, (_, i, f) => sinoKo(i) + ' 점 ' + f.split('').map(c => c === '0' ? '영' : sinoKo(c)).join(''))
    .replace(/(\d{1,3}(?:,\d{3})+|\d+)/g, x => sinoKo(x.replace(/,/g, '')));
}

// ───────────── 오디션 · 녹음 (part5b의 흐름에 끼워 넣음) ─────────────
async function stSynthMeasured(text, voice, speed, steps) {
  const { wav, sr } = await ST.synth(text, voice, { speed, steps });
  const url = URL.createObjectURL(pcmToWav(wav, sr));
  const m = await measureVoice(url, text);
  return { url, m, sec: wav.length / sr };
}
async function castSupertonic(pod, spec, mon) {
  const prog = $('#stProg');
  const say = t => { A.artist.status(t, true); logit('artist', t, 'Supertonic 3 · 브라우저'); };
  mon('목소리 엔진 준비 — Supertonic 3', `${specTable(spec)}<p class="pm-note">Supertone의 Supertonic 3를 이 브라우저 안에서 실행해요. 처음 한 번 모델(약 400MB)을 받고, 다음부터는 캐시에서 바로 열어요.</p><div class="pm-load"><i id="stBar"></i></div><p class="pm-note" id="stMsg">모델 불러오는 중…</p>`);
  await ST.load(p => { const b = $('#stBar'), m = $('#stMsg'); if (b) b.style.width = Math.round(p.frac * 100) + '%'; if (m) m.textContent = `${p.stage === 'session' ? '엔진 여는 중' : p.cached ? '캐시에서 읽는 중' : '받는 중'} · ${p.file} · ${Math.round(p.frac * 100)}%`; });
  logit('artist', `Supertonic 3 준비 완료 (${ST.ep})`, 'onnxruntime-web');
  const steps = 8;
  // 진행자: 저장된 선택이 있으면 그대로(프로그램의 목소리는 고정), 없으면 여성 프리셋 5개를 재고 억양 폭이 가운데인 목소리
  // 프로그램의 목소리(진행자)는 고정: 저장된 선택 → EP.1 녹음본의 진행자 → 없으면 측정해서 고른다
  let host = XI.get('st_host');
  if (!host && (window.POD_BANK || await BANK.load())) { const h = window.POD_BANK.meta.audition.host; host = { v: h.v, m: h }; XI.put('st_host', host); }
  if (!host) {
    say('진행자 목소리 고르는 중 (처음 한 번)'); const hl = [];
    for (const v of ST.female) { try { const r = await stSynthMeasured(HOST.sample, v, 1.05, steps); hl.push({ v, m: r.m }); } catch (e) { console.warn(e); } }
    hl.sort((a, b) => a.m.rangeSt - b.m.rangeSt); host = hl[Math.floor(hl.length / 2)]; XI.put('st_host', host);
  }
  // 게스트: 진행자와 반대 음역의 프리셋 5개를 같은 대사로 녹음해 측정
  const guestText = pod.lines.filter(l => l.who === 'guest').slice(0, 2).map(l => l.text).join(' ');
  const pool = spec.gender === 'male' ? ST.male : ST.female; const list = [];
  for (const [i, v] of pool.entries()) {
    say(`오디션 ${i + 1}/${pool.length} — ${v}`);
    try {
      const r = await stSynthMeasured(guestText, v, 1.05 * spec.rate, steps);
      list.push({ n: i + 1, v, m: r.m, s: auditionScore(r.m, host.m, spec) });
      mon('오디션 — 측정해서 고른다', auditionSVG(list, host.m, spec) + auditionRows(list));
      A.artist.sayNow(`${v} 듣는 중`, 1300);
      try { const au = new Audio(r.url); au.volume = .9; await au.play(); await new Promise(res => { const t = setTimeout(res, 2600 / Math.max(1, SPEED)); au.onended = () => { clearTimeout(t); res(); }; }); au.pause(); } catch { await wait(600); }
    } catch (e) { console.warn(e); }
  }
  if (!list.length) throw new Error('오디션 목소리를 만들지 못했어요');
  const best = [...list].sort((a, b) => b.s.total - a.s.total)[0]; best.pick = true;
  mon('오디션 결과', auditionSVG(list, host.m, spec) + auditionRows(list));
  A.artist.sayNow(`<b>${best.v}</b>! 진행자와 ${best.s.d}반음 차이`, 2400); await wait(2600);
  pod.audition = { engine: 'supertonic', host: { ...host.m, v: host.v }, list: list.map(x => ({ ...x })) };
  return { host: { v: host.v, speed: 1.05 }, guest: { v: best.v, speed: +(1.05 * spec.rate).toFixed(3) }, steps };
}
async function recordSupertonic(pod, mark) {
  const sr = ST.cfg.ae.sample_rate, gap = Math.floor(0.38 * sr), parts = []; let t = 0;
  for (const l of pod.lines) {
    const p = l.who === 'host' ? pod.voices.host : pod.voices.guest;
    const { wav } = await ST.synth(l.text, p.v, { speed: p.speed, steps: pod.voices.steps || 8 });
    const d = wav.length / sr; l.t0 = t; l.t1 = t + d;
    l.tSay = l.say ? t + d * sylRatio(l.text, l.say) : null;
    parts.push(wav); t += d + 0.38; mark(l.n, `${l.t0.toFixed(1)}s`);
  }
  const pcm = concatPCM(parts, gap); pod.dur = pcm.length / sr; pod.model = 'Supertonic 3';
  if (pod.audioUrl) URL.revokeObjectURL(pod.audioUrl); pod.audioUrl = URL.createObjectURL(pcmToWav(pcm, sr)); pod.pcm = { pcm, sr };
  logit('artist', `녹음 완료 — ${Math.round(pod.dur)}초 · 줄별 시각 ${pod.lines.length}구간`, `Supertonic 3 · ${ST.ep}`);
}
function sylRatio(text, say) { const k = text.indexOf(say); if (k < 0) return 0; const syl = s => (s.match(/[가-힣0-9A-Za-z]/g) || []).length; return syl(text.slice(0, k)) / Math.max(1, syl(text)); }

// ───────────── 데모 녹음본 (같은 Supertonic 파이프라인으로 미리 만든 소리 은행) ─────────────
// assets/podcast/ep1-bank.js 가 window.POD_BANK = { meta, wav64 } 을 넣는다. 파일로 열어도(file://) 읽히도록 스크립트로 싣는다.
const BANK = {
  buf: null,
  async load() {
    if (this.buf) return true;
    if (!window.POD_BANK) {
      try {   // 웹(아티팩트·GitHub Pages)에서는 fetch로 읽고, 파일로 열었을 때(file://)는 스크립트 태그로 읽는다
        const t = await (await fetch('assets/podcast/ep1-bank.js')).text();
        window.POD_BANK = { meta: JSON.parse(t.slice(t.indexOf('meta: ') + 6, t.indexOf(', wav64: "'))), wav64: t.slice(t.indexOf('wav64: "') + 8, t.lastIndexOf('"')) };
      } catch { try { await ST.loadScript(new URL('assets/podcast/ep1-bank.js', location.href).href); } catch { return false; } }
    }
    const B = window.POD_BANK; if (!B?.wav64) return false;
    const bin = atob(B.wav64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    const AC = window.AudioContext || window.webkitAudioContext; const ac = new AC();
    try { this.buf = await ac.decodeAudioData(u.buffer); } finally { ac.close?.(); }
    this.meta = B.meta; return true;
  },
  key: (v, text) => v + '|' + text,
  clip(v, text) { const c = this.meta?.clips?.[this.key(v, text)]; if (!c || !this.buf) return null; const sr = this.buf.sampleRate; return this.buf.getChannelData(0).slice(Math.round(c[0] * sr), Math.round(c[1] * sr)); },
  url(pcm) { return URL.createObjectURL(pcmToWav(pcm, this.buf.sampleRate)); }
};
async function castBank(pod, spec, mon) {
  const M = BANK.meta, host = M.audition.host;
  const list = M.audition.list.map(x => ({ ...x, s: auditionScore(x.m, host, spec) }));
  list.forEach(x => { x.pick = false; }); const best = [...list].sort((a, b) => b.s.total - a.s.total)[0]; best.pick = true;
  const guestText = pod.lines.filter(l => l.who === 'guest').slice(0, 2).map(l => l.text).join(' ');
  for (let i = 1; i <= list.length; i++) {
    const cur = list.slice(0, i); mon('오디션 — 측정해서 고른다 (녹음본)', auditionSVG(cur, host, spec) + auditionRows(cur));
    const x = list[i - 1]; A.artist.sayNow(`${x.v} 듣는 중`, 1300); A.artist.status(`오디션 ${i}/${list.length} — ${x.v}`, true);
    const pcm = BANK.clip(x.v, guestText);
    if (pcm) { try { const au = new Audio(BANK.url(pcm)); await au.play(); await new Promise(r => { const t = setTimeout(r, 2600 / Math.max(1, SPEED)); au.onended = () => { clearTimeout(t); r(); }; }); au.pause(); } catch { await wait(600); } } else await wait(700);
  }
  mon('오디션 결과', auditionSVG(list, host, spec) + auditionRows(list));
  A.artist.sayNow(`<b>${best.v}</b>! 진행자와 ${best.s.d}반음 차이`, 2400); await wait(2600);
  pod.audition = { engine: 'supertonic', bank: true, host, list };
  logit('artist', `오디션 녹음본 재생 — 진행자 ${host.v} · 게스트 후보 ${list.length}개 측정값`, 'Supertonic 3 · 녹음본');
  return { host: { v: host.v, speed: M.host.speed }, guest: { v: best.v, speed: M.guest.speed }, steps: M.steps };
}
async function recordBank(pod, mark) {
  const sr = BANK.buf.sampleRate, parts = []; let t = 0, live = 0;
  for (const l of pod.lines) {
    const p = l.who === 'host' ? pod.voices.host : pod.voices.guest;
    let pcm = BANK.clip(p.v, l.text);
    if (!pcm) {   // 녹음본에 없는 문장(수정·의견 반영)은 그 자리에서 합성
      if (!ST.tts) await ST.load(() => { });
      const r = await ST.synth(l.text, p.v, { speed: p.speed, steps: pod.voices.steps || 8 }); pcm = resamplePCM(r.wav, r.sr, sr); live++;
    }
    const d = pcm.length / sr; l.t0 = t; l.t1 = t + d; l.tSay = l.say ? t + d * sylRatio(l.text, l.say) : null;
    parts.push(pcm); t += d + 0.38; mark(l.n, `${l.t0.toFixed(1)}s`); await wait(90);
  }
  const pcm = concatPCM(parts, Math.floor(0.38 * sr)); pod.dur = pcm.length / sr; pod.model = 'Supertonic 3';
  if (pod.audioUrl) URL.revokeObjectURL(pod.audioUrl); pod.audioUrl = URL.createObjectURL(pcmToWav(pcm, sr));
  logit('artist', `녹음 — 녹음본 ${pod.lines.length - live}줄${live ? ` + 새로 합성 ${live}줄` : ''} · ${Math.round(pod.dur)}초`, 'Supertonic 3');
}
