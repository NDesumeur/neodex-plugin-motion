// Motion : régler une courbe d'animation et la voir bouger. Courbe de Bézier à deux poignées ou ressort (masse, raideur, amortissement),
// 3 courbes comparées côte à côte, aperçu sur 4 propriétés, et le CSS prêt à copier (cubic-bezier, linear() pour le ressort, @keyframes).
const CSS = `
.moGrid{display:grid;grid-template-columns:340px minmax(0,1fr);gap:14px}
@media (max-width:900px){.moGrid{grid-template-columns:minmax(0,1fr)}.moGrid>:last-child{order:-1}}
.moCan{width:100%;max-width:340px;aspect-ratio:1;display:block;image-rendering:pixelated;background:#0b0816;border:2px solid var(--line);touch-action:none}
.moRow{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:6px 0}
.moRow .btn{width:auto;margin:0}
.moRow .f{width:auto;flex:1;min-width:0;margin:0}
.moRange{-webkit-appearance:none;appearance:none;height:10px;background:var(--bg0);border:2px solid var(--line);outline:none;flex:1;min-width:80px}
.moRange::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:22px;background:var(--magenta);border:2px solid #000;cursor:var(--cp,pointer)}
.moStage{position:relative;height:290px;background:#0b0816;border:2px solid var(--line);overflow:hidden}
.moLane{position:absolute;left:0;right:0;height:56px;border-bottom:1px dashed #241c40}
.moBox{position:absolute;left:14px;top:14px;width:28px;height:28px;border:2px solid #000}
.moCode{font:12px monospace;background:var(--bg0);border:2px solid var(--line);padding:8px;white-space:pre-wrap;word-break:break-all;color:var(--lilac);margin:6px 0}
.moTabs{display:flex;gap:6px;margin-bottom:8px}
.moTabs .btn{width:auto;margin:0}
.moCurve{display:flex;gap:6px;align-items:center;margin:4px 0}
.moCurve i{width:14px;height:14px;border:2px solid #000;flex:none}
.moCurve .btn{width:auto;margin:0;flex:1;text-align:left;padding:4px 10px}
`;
const COLORS = ['#ff4fb0', '#4fc3ff', '#ffd34f'];
const PRESETS = {linear: [0, 0, 1, 1], ease: [.25, .1, .25, 1], 'ease-in': [.42, 0, 1, 1], 'ease-out': [0, 0, .58, 1], 'ease-in-out': [.42, 0, .58, 1],
  'Retour (back-out)': [.34, 1.56, .64, 1], 'Élan (back-in)': [.36, 0, .66, -.56], 'Rapide (expo-out)': [.16, 1, .3, 1], 'Doux (sine-in-out)': [.37, 0, .63, 1], 'Brusque (quart-in)': [.5, 0, .75, 0]};
// la courbe de Bézier comme le navigateur : on cherche t tel que x(t) = x par Newton, puis y(t)
function bezier([x1, y1, x2, y2]) {
  const A = (a, b) => 1 - 3 * b + 3 * a, B = (a, b) => 3 * b - 6 * a, Cc = a => 3 * a;
  const f = (t, a, b) => ((A(a, b) * t + B(a, b)) * t + Cc(a)) * t, d = (t, a, b) => 3 * A(a, b) * t * t + 2 * B(a, b) * t + Cc(a);
  return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const dx = d(t, x1, x2); if (Math.abs(dx) < 1e-6) break; t -= (f(t, x1, x2) - x) / dx; }
    if (t < 0 || t > 1 || Math.abs(f(t, x1, x2) - x) > 1e-4) { let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { (f(t, x1, x2) < x ? lo = t : hi = t); t = (lo + hi) / 2; } }
    return f(t, y1, y2); };
}
// le ressort : intégré pas à pas jusqu'au repos ; renvoie la fonction et sa durée naturelle
function spring({mass, stiffness, damping, velocity}) {
  const dt = 1 / 600, pts = [0]; let x = 0, v = velocity, t = 0, still = 0;
  while (t < 10) { const a = (-stiffness * (x - 1) - damping * v) / mass; v += a * dt; x += v * dt; t += dt; pts.push(x); if (Math.abs(x - 1) < 1e-3 && Math.abs(v) < 1e-2) { if (++still > 30) break; } else still = 0; }
  const dur = t, fn = p => { if (p >= 1) return 1; const i = p * (pts.length - 1), k = Math.floor(i); return pts[k] + (pts[Math.min(k + 1, pts.length - 1)] - pts[k]) * (i - k); };
  return {fn, dur};
}
const r3 = v => +v.toFixed(3);
// ---------- le mode Animer : des calques (formes, textes, images) animés par images clés sur une timeline ----------
const ANIM_CSS = `
.maGrid{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:14px}
@media (max-width:980px){.maGrid{grid-template-columns:minmax(0,1fr)}}
.maStage{width:100%;display:block;background:#000;border:2px solid var(--line);touch-action:none;margin:0 auto}
.maTl{width:100%;display:block;background:#0b0816;border:2px solid var(--line);touch-action:none;margin-top:6px}
.maSide{display:flex;flex-direction:column;gap:10px}
.maLayer{display:flex;gap:4px;align-items:center;margin:3px 0}
.maLayer .btn{width:auto;margin:0;padding:3px 8px}
.maLayer .nm{flex:1;text-align:left;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.maProp{display:grid;grid-template-columns:86px minmax(0,1fr) 34px;gap:4px;align-items:center;margin:3px 0}
.maProp .f{margin:0;width:100%;min-width:0}
.maProp .btn{margin:0;width:34px;padding:2px 0}
.maProp input[type=color]{height:26px;padding:0}
.maKey{color:var(--magenta)}
`;
const EASES = ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'Retour (back-out)', 'Élan (back-in)', 'Rapide (expo-out)', 'Doux (sine-in-out)', 'Brusque (quart-in)', 'Courbe rose', 'Courbe bleue', 'Courbe jaune', 'Saut'];
const PROPS = [{k: 'x', t: 'X', s: 1}, {k: 'y', t: 'Y', s: 1}, {k: 'scale', t: 'Échelle', s: .05}, {k: 'rot', t: 'Rotation °', s: 5}, {k: 'op', t: 'Opacité', s: .05}, {k: 'blur', t: 'Flou', s: .5}, {k: 'col', t: 'Couleur', color: true}];
const FORMATS = {'16:9': [640, 360], '9:16': [360, 640], '1:1': [480, 480]};
const FILLS = ['#ff4fb0', '#4fc3ff', '#ffd34f', '#7ee07a', '#b48cff', '#ff8a4a'];
const hex2 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) || 0);
const mixCol = (a, b, f) => '#' + hex2(a).map((v, i) => Math.round(v + (hex2(b)[i] - v) * f).toString(16).padStart(2, '0')).join('');
const r1 = v => +v.toFixed(1);
// la valeur d'une propriété à l'instant t : entre deux images clés, l'accélération de la clé d'arrivée
function valAt(L, k, t, ease) {
  const ks = L.keys[k]; if (!ks?.length) return L.base[k];
  if (t <= ks[0].t) return ks[0].v; const last = ks[ks.length - 1]; if (t >= last.t) return last.v;
  let i = 1; while (ks[i].t < t) i++;
  const a = ks[i - 1], b = ks[i], f = ease(b.e)((t - a.t) / (b.t - a.t));
  return k === 'col' ? mixCol(a.v, b.v, Math.max(0, Math.min(1, f))) : a.v + (b.v - a.v) * f;
}
async function animator(ctx, {el, toast, st, fnOf, save}) {
  ctx.host.addStyle(ANIM_CSS);
  const easeCache = new Map();
  const ease = name => { const ci = ['Courbe rose', 'Courbe bleue', 'Courbe jaune'].indexOf(name); if (ci >= 0) { const key = 'c' + JSON.stringify(st.curves[ci]); if (!easeCache.has(key)) easeCache.set(key, fnOf(st.curves[ci])); return easeCache.get(key); } if (name === 'Saut') return p => p < 1 ? 0 : 1;
    if (!easeCache.has(name)) easeCache.set(name, bezier(PRESETS[name] || PRESETS.ease)); return easeCache.get(name); };
  const scene = st.scene ||= {fmt: '16:9', dur: 3000, bg: '#14102a', loop: true, layers: []};
  let nid = 1; const uid = () => Date.now().toString(36) + (nid++);
  const imgs = new Map();
  for (const L of scene.layers) if (L.img) try { const b = await ctx.folder.readFile(L.img); if (b) { const im = new Image(); im.src = 'data:image/png;base64,' + b; await im.decode().catch(() => {}); imgs.set(L.img, im); } } catch {}
  let T = 0, sel = scene.layers.at(-1)?.id || null, selKeys = null, playing = false, autokey = true, exporting = false, p0 = 0, raf = 0;
  const hist = [], redo = [];
  const snap = () => { hist.push(JSON.stringify(scene)); if (hist.length > 60) hist.shift(); redo.length = 0; };
  const restore = (from, to) => { if (!from.length) return; to.push(JSON.stringify(scene)); const s = JSON.parse(from.pop()); Object.keys(scene).forEach(k => delete scene[k]); Object.assign(scene, s); selKeys = null; if (!layerOf(sel)) sel = scene.layers.at(-1)?.id || null; changed(); };
  const layerOf = id => scene.layers.find(L => L.id === id), SL = () => layerOf(sel);
  const v = (L, k, t = T) => valAt(L, k, t, ease);
  const keyAt = (L, k, t = T) => (L.keys[k] || []).find(q => Math.abs(q.t - t) < 6);
  function setVal(L, k, val) {  // en mode Auto, ou si la propriété est déjà animée : une image clé à l'instant présent ; sinon la valeur de base
    if (autokey || L.keys[k]?.length) { const ks = L.keys[k] ||= []; const q = keyAt(L, k); if (q) q.v = val; else { ks.push({t: Math.round(T), v: val, e: 'ease-in-out'}); ks.sort((a, b) => a.t - b.t); } }
    else L.base[k] = val;
  }
  function addKey(L, k, t, val, e = 'ease-in-out') { const ks = L.keys[k] ||= []; const q = ks.find(q => Math.abs(q.t - t) < 6); if (q) { q.v = val; q.e = e; } else ks.push({t: Math.max(0, Math.round(t)), v: val, e}); ks.sort((a, b) => a.t - b.t); }
  function newLayer(type, extra = {}) {
    const [w, h] = FORMATS[scene.fmt], n = scene.layers.length;
    const names = {rect: 'Rectangle', circle: 'Cercle', tri: 'Triangle', star: 'Étoile', text: 'Texte', image: 'Image'};
    const L = {id: uid(), name: names[type] + ' ' + (n + 1), type, text: 'Titre', font: 'sans-serif', size: 48, w: 90, h: 90, r: 12, sw: 0, stroke: '#000000', img: null,
      base: {x: Math.round(w / 2 + (n % 5 - 2) * 16), y: Math.round(h / 2 + (n % 3 - 1) * 16), scale: 1, rot: 0, op: 1, blur: 0, col: type === 'text' ? '#ffffff' : FILLS[n % FILLS.length]}, keys: {}, ...extra};
    snap(); scene.layers.push(L); sel = L.id; selKeys = null; changed(); return L;
  }
  // ---------- le dessin d'une image ----------
  const stage = el('canvas', 'maStage'), sg = stage.getContext('2d');
  function sizeStage() { const [w, h] = FORMATS[scene.fmt]; stage.width = w * 2; stage.height = h * 2; stage.style.maxWidth = (scene.fmt === '9:16' ? 300 : scene.fmt === '1:1' ? 420 : 760) + 'px'; }
  function drawLayer(g, L, t) {
    const x = v(L, 'x', t), y = v(L, 'y', t), sc = v(L, 'scale', t), rot = v(L, 'rot', t), op = v(L, 'op', t), bl = v(L, 'blur', t);
    g.save(); g.translate(x, y); g.rotate(rot * Math.PI / 180); g.scale(sc, sc); g.globalAlpha = Math.max(0, Math.min(1, op)); g.filter = bl > 0 ? `blur(${bl}px)` : 'none';
    g.fillStyle = v(L, 'col', t); g.strokeStyle = L.stroke; g.lineWidth = L.sw; g.lineJoin = 'round';
    let w = L.w, h = L.h;
    if (L.type === 'text') {
      g.font = `bold ${L.size}px ${L.font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; const lines = String(L.text).split('\n');
      w = Math.max(10, ...lines.map(s => g.measureText(s).width)); h = L.size * 1.2 * lines.length;
      lines.forEach((s, i) => { const yy = (i - (lines.length - 1) / 2) * L.size * 1.2; if (L.sw) g.strokeText(s, 0, yy); g.fillText(s, 0, yy); });
    } else if (L.type === 'image') { const im = imgs.get(L.img); if (im?.naturalWidth) g.drawImage(im, -w / 2, -h / 2, w, h); else g.fillRect(-w / 2, -h / 2, w, h); }
    else {
      g.beginPath();
      if (L.type === 'rect') g.roundRect(-w / 2, -h / 2, w, h, Math.max(0, Math.min(L.r, w / 2, h / 2)));
      else if (L.type === 'circle') g.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
      else { const n = L.type === 'star' ? 10 : 3; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i * 2 * Math.PI / n, rr = L.type === 'star' && i % 2 ? .45 : 1; g.lineTo(Math.cos(a) * w / 2 * rr, Math.sin(a) * h / 2 * rr); } g.closePath(); }
      g.fill(); if (L.sw) g.stroke();
    }
    L._w = w; L._h = h; g.restore();
  }
  function render(t = T) {
    const g = sg, [w, h] = FORMATS[scene.fmt]; g.setTransform(2, 0, 0, 2, 0, 0); g.filter = 'none'; g.globalAlpha = 1;
    g.fillStyle = scene.bg; g.fillRect(0, 0, w, h);
    for (const L of scene.layers) if (!L.hidden) drawLayer(g, L, t);
    const L = SL(); if (L && !exporting && !L.hidden) {  // le calque choisi : son trajet en pointillés et son cadre
      g.fillStyle = 'rgba(255,255,255,.55)'; if (L.keys.x?.length > 1 || L.keys.y?.length > 1) for (let k = 0; k <= 60; k++) { const tt = k / 60 * scene.dur; g.fillRect(v(L, 'x', tt) - 1, v(L, 'y', tt) - 1, 2, 2); }
      const sc = v(L, 'scale'); g.save(); g.translate(v(L, 'x'), v(L, 'y')); g.rotate(v(L, 'rot') * Math.PI / 180); g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeStyle = '#ffffff';
      g.strokeRect(-L._w * sc / 2 - 4, -L._h * sc / 2 - 4, L._w * sc + 8, L._h * sc + 8); g.setLineDash([]); g.fillStyle = '#ff4fb0'; g.fillRect(-3, -3, 6, 6); g.restore();
    }
  }
  // ---------- la scène à la souris : choisir un calque, le déplacer ----------
  const spos = e => { const r = stage.getBoundingClientRect(), [w, h] = FORMATS[scene.fmt]; return [(e.clientX - r.left) / r.width * w, (e.clientY - r.top) / r.height * h]; };
  const hit = (L, px, py) => { const sc = v(L, 'scale') || 1e-3, a = -v(L, 'rot') * Math.PI / 180, dx = px - v(L, 'x'), dy = py - v(L, 'y'), lx = (dx * Math.cos(a) - dy * Math.sin(a)) / sc, ly = (dx * Math.sin(a) + dy * Math.cos(a)) / sc;
    return Math.abs(lx) <= (L._w || 0) / 2 + 4 && Math.abs(ly) <= (L._h || 0) / 2 + 4; };
  let drag = null;
  stage.onpointerdown = e => {
    const [x, y] = spos(e), L = [...scene.layers].reverse().find(L => !L.hidden && !L.locked && hit(L, x, y));
    sel = L?.id || null; selKeys = null; side(); render(); drawTl(); if (!L) return;
    drag = {L, x, y, ox: v(L, 'x'), oy: v(L, 'y'), moved: false}; try { stage.setPointerCapture(e.pointerId); } catch {}
  };
  stage.onpointermove = e => { if (!drag) return; const [x, y] = spos(e); if (!drag.moved) { snap(); drag.moved = true; }
    setVal(drag.L, 'x', Math.round(drag.ox + x - drag.x)); setVal(drag.L, 'y', Math.round(drag.oy + y - drag.y)); render(); drawTl(); };
  stage.onpointerup = () => { if (drag?.moved) changed(); drag = null; };
  // ---------- la timeline ----------
  const tl = el('canvas', 'maTl'), tg = tl.getContext('2d'), LAB = 104, RUL = 18;
  let rows = [];
  const tx = t => LAB + t / scene.dur * (tl.width - LAB - 10), xt = x => Math.max(0, Math.min(scene.dur, (x - LAB) / (tl.width - LAB - 10) * scene.dur));
  function drawTl() {
    const W = Math.max(300, tl.clientWidth || 600); rows = []; let y = RUL;
    for (const L of [...scene.layers].reverse()) { rows.push({L, y, h: 20}); y += 20; if (L.id === sel) for (const P of PROPS) { rows.push({L, k: P.k, t: P.t, y, h: 15}); y += 15; } }
    const H = Math.max(y + 6, 60); if (tl.width !== W) tl.width = W; if (tl.height !== H) tl.height = H;
    const g = tg; g.fillStyle = '#0b0816'; g.fillRect(0, 0, W, H); g.font = '10px monospace'; g.textBaseline = 'middle';
    g.fillStyle = '#1a1430'; g.fillRect(0, 0, W, RUL);
    const step = scene.dur > 12000 ? 2000 : scene.dur > 5000 ? 1000 : scene.dur > 2000 ? 500 : 250;
    for (let t = 0; t <= scene.dur + 1; t += step / 5) { const x = Math.round(tx(t)), big = Math.abs(t / step - Math.round(t / step)) < 1e-6; g.fillStyle = big ? '#6a5a98' : '#3a2f5a'; g.fillRect(x, big ? 4 : 11, 1, big ? 14 : 7); if (big) { g.fillStyle = '#c8b8f0'; g.fillText((t / 1000).toFixed(t % 1000 ? 2 : 0) + 's', x + 3, 8); } }
    for (const r of rows) {
      const isSel = r.L.id === sel;
      g.fillStyle = r.k ? '#120e22' : isSel ? '#2a1f4a' : '#16122a'; g.fillRect(0, r.y, W, r.h - 1);
      g.fillStyle = r.k ? '#8a7aa8' : '#e8e0ff'; g.fillText(r.k ? '  ' + r.t : (r.L.hidden ? '◌ ' : '● ') + r.L.name.slice(0, 13), 4, r.y + r.h / 2);
      const ks = r.k ? (r.L.keys[r.k] || []) : [...new Set(Object.values(r.L.keys).flat().map(q => q.t))].map(t => ({t}));
      for (const q of ks) { const x = Math.round(tx(q.t)), cy = r.y + r.h / 2, s = r.k ? 4 : 5, on = selKeys?.L === r.L && (r.k ? selKeys.keys.includes(q) : selKeys.t === q.t && !selKeys.k);
        g.fillStyle = '#000'; g.beginPath(); g.moveTo(x, cy - s - 1); g.lineTo(x + s + 1, cy); g.lineTo(x, cy + s + 1); g.lineTo(x - s - 1, cy); g.fill();
        g.fillStyle = on ? '#ffffff' : r.k ? '#ffd34f' : '#ff4fb0'; g.beginPath(); g.moveTo(x, cy - s); g.lineTo(x + s, cy); g.lineTo(x, cy + s); g.lineTo(x - s, cy); g.fill(); }
    }
    const px = Math.round(tx(T)); g.fillStyle = '#ff4a4a'; g.fillRect(px, 0, 2, H); g.fillRect(px - 4, 0, 10, 6);
  }
  let tdrag = null;
  tl.onpointerdown = e => {
    const r0 = tl.getBoundingClientRect(), x = (e.clientX - r0.left) / r0.width * tl.width, y = (e.clientY - r0.top) / r0.height * tl.height;
    try { tl.setPointerCapture(e.pointerId); } catch {}
    if (y < RUL) { tdrag = {scrub: true}; seek(xt(x)); return; }
    const r = rows.find(r => y >= r.y && y < r.y + r.h); if (!r) return;
    if (sel !== r.L.id) { sel = r.L.id; selKeys = null; side(); }
    if (x < LAB) { if (!r.k && x < 14) { snap(); r.L.hidden = !r.L.hidden; changed(); } else { render(); drawTl(); } return; }
    const keys = r.k ? (r.L.keys[r.k] || []) : Object.values(r.L.keys).flat(), q = keys.map(q => [q, Math.abs(tx(q.t) - x)]).filter(([, d]) => d < 7).sort((a, b) => a[1] - b[1])[0]?.[0];
    if (q) { selKeys = r.k ? {L: r.L, k: r.k, keys: [q]} : {L: r.L, t: q.t, keys: keys.filter(k => k.t === q.t)}; tdrag = {keys: selKeys.keys, x, t0: q.t, moved: false}; seek(q.t); side(); }
    else { selKeys = null; seek(xt(x)); tdrag = {scrub: true}; side(); }
  };
  tl.onpointermove = e => {
    if (!tdrag) return; const r0 = tl.getBoundingClientRect(), x = (e.clientX - r0.left) / r0.width * tl.width;
    if (tdrag.scrub) return seek(xt(x));
    if (!tdrag.moved) { if (Math.abs(x - tdrag.x) < 3) return; snap(); tdrag.moved = true; }
    const nt = Math.round(xt(tx(tdrag.t0) + x - tdrag.x) / 10) * 10; for (const q of tdrag.keys) q.t = nt; if (selKeys) selKeys.t = nt;
    for (const ks of Object.values(SL().keys)) ks.sort((a, b) => a.t - b.t); seek(nt);
  };
  tl.onpointerup = () => { if (tdrag?.moved) changed(); tdrag = null; };
  // ---------- lecture ----------
  const timeL = el('span', 'hint'), playB = el('button', 'btn px main', '▶');
  const fmtT = t => (t / 1000).toFixed(2).replace('.', ',') + ' s';
  function seek(t) { T = Math.max(0, Math.min(scene.dur, t)); timeL.textContent = fmtT(T) + ' / ' + fmtT(scene.dur); render(); drawTl(); if (!playing) syncProps(); }
  function tick(now) { if (!view0.isConnected) return; let t = now - p0; if (t >= scene.dur) { if (scene.loop && !exporting) { p0 = now; t = 0; } else { t = scene.dur; playing = false; playB.textContent = '▶'; } } seek(t); if (playing) raf = requestAnimationFrame(tick); else syncProps(); }
  function play(on = !playing) { playing = on; playB.textContent = on ? '⏸' : '▶'; cancelAnimationFrame(raf); if (on) { if (T >= scene.dur) T = 0; p0 = performance.now() - T; raf = requestAnimationFrame(tick); } }
  playB.onclick = () => play();
  // ---------- le panneau de droite : calques, propriétés, image clé, effets, export ----------
  const layersBox = el('div', 'sysCard px'), propsBox = el('div', 'sysCard px'), keyBox = el('div', 'sysCard px'), fxBox = el('div', 'sysCard px'), expBox = el('div', 'sysCard px');
  const btn = (t, f, cls = 'btn px') => { const b = el('button', cls, t); b.onclick = f; return b; };
  const row = (...k) => { const r = el('div', 'moRow'); r.append(...k); return r; };
  const imgIn = el('input'); imgIn.type = 'file'; imgIn.accept = 'image/*'; imgIn.hidden = true;
  imgIn.onchange = async () => { const f = imgIn.files[0]; imgIn.value = ''; if (f) await addImage(f); };
  async function addImage(f) {
    const url = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => ko(r.error); r.readAsDataURL(f); });
    const im = new Image(); im.src = url; try { await im.decode(); } catch { toast('Image illisible : ' + f.name); return null; }
    const name = 'img-' + uid() + '.png', [w, h] = FORMATS[scene.fmt], k = Math.min(1, w * .6 / im.naturalWidth, h * .6 / im.naturalHeight);
    try { const c = el('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; c.getContext('2d').drawImage(im, 0, 0); await ctx.folder.writeFile(name, c.toDataURL('image/png').split(',')[1]); } catch { toast('Image gardée pour cette séance seulement'); }
    imgs.set(name, im); return newLayer('image', {img: name, name: f.name.replace(/\.[^.]+$/, '').slice(0, 20), w: Math.round(im.naturalWidth * k), h: Math.round(im.naturalHeight * k)});
  }
  function drawLayers() {
    layersBox.replaceChildren(el('span', 'label', 'Calques'),
      row(...[['▭', 'rect', 'Rectangle'], ['◯', 'circle', 'Cercle'], ['△', 'tri', 'Triangle'], ['★', 'star', 'Étoile'], ['T', 'text', 'Texte']].map(([s, k, t]) => { const b = btn(s, () => newLayer(k)); b.title = 'Ajouter : ' + t; b.dataset.add = k; return b; }), btn('🖼', () => imgIn.click()), imgIn));
    for (const L of [...scene.layers].reverse()) {
      const r = el('div', 'maLayer'), nm = btn((L.hidden ? '◌ ' : '') + L.name, () => { sel = L.id; selKeys = null; side(); render(); drawTl(); }, 'btn px nm' + (L.id === sel ? ' main' : ''));
      r.append(nm, btn('▲', () => moveLayer(L, 1)), btn('▼', () => moveLayer(L, -1))); layersBox.append(r);
    }
    if (!scene.layers.length) layersBox.append(el('p', 'hint', 'Ajoute une forme, un texte ou une image, puis anime-la.'));
  }
  function moveLayer(L, d) { const i = scene.layers.indexOf(L), j = i + d; if (j < 0 || j >= scene.layers.length) return; snap(); scene.layers.splice(i, 1); scene.layers.splice(j, 0, L); changed(); }
  const propIns = {};
  function drawProps() {
    const L = SL(); propsBox.replaceChildren(el('span', 'label', 'Propriétés')); for (const k in propIns) delete propIns[k];
    if (!L) { propsBox.append(el('p', 'hint', 'Clique sur un calque dans la scène ou dans la liste.')); return; }
    const nm = el('input', 'f'); nm.value = L.name; nm.onchange = () => { snap(); L.name = nm.value.slice(0, 40) || L.name; changed(); }; propsBox.append(nm);
    const autoB = btn(autokey ? '● Auto' : '○ Auto', () => { autokey = !autokey; drawProps(); }, 'btn px' + (autokey ? ' main' : '')); autoB.title = 'Auto : chaque changement pose une image clé à l\'instant présent';
    propsBox.append(row(autoB, el('span', 'hint', 'à ' + fmtT(T))));
    for (const P of PROPS) {
      const r = el('div', 'maProp'), inp = el('input', 'f'); inp.type = P.color ? 'color' : 'number'; if (!P.color) inp.step = P.s; inp.dataset.p = P.k;
      inp.onchange = () => { const val = P.color ? inp.value : parseFloat(inp.value); if (!P.color && isNaN(val)) return; snap(); setVal(L, P.k, val); changed(); };
      if (P.color) inp.oninput = () => { setVal(L, P.k, inp.value); render(); };
      const kb = btn('◇', () => { snap(); const q = keyAt(L, P.k); if (q) { L.keys[P.k].splice(L.keys[P.k].indexOf(q), 1); if (!L.keys[P.k].length) { L.base[P.k] = q.v; delete L.keys[P.k]; } } else addKey(L, P.k, T, v(L, P.k)); changed(); });
      kb.title = 'Image clé ici'; kb.dataset.key = P.k; propIns[P.k] = [inp, kb]; r.append(el('span', 'hint', P.t), inp, kb); propsBox.append(r);
    }
    const geo = (t, k, mn, mx) => { const i = el('input', 'f'); i.type = 'number'; i.min = mn; i.max = mx; i.value = L[k]; i.onchange = () => { const x = parseFloat(i.value); if (isNaN(x)) return; snap(); L[k] = Math.max(mn, Math.min(mx, x)); changed(); }; const r = el('div', 'maProp'); r.append(el('span', 'hint', t), i, el('span')); return r; };
    if (L.type === 'text') {
      const ta = el('textarea', 'f'); ta.rows = 2; ta.value = L.text; ta.oninput = () => { L.text = ta.value; render(); }; ta.onchange = () => { snap(); changed(); };
      const fo = el('select', 'f'); for (const [k, t] of [['sans-serif', 'Sans'], ['serif', 'Serif'], ['monospace', 'Machine'], ['"Press Start 2P", monospace', 'Pixel'], ['cursive', 'Manuscrite'], ['Impact, sans-serif', 'Impact']]) { const o = el('option', '', t); o.value = k; fo.append(o); } fo.value = L.font; fo.onchange = () => { snap(); L.font = fo.value; changed(); };
      propsBox.append(ta, row(fo), geo('Taille', 'size', 6, 400));
    } else { propsBox.append(geo('Largeur', 'w', 2, 2000), geo('Hauteur', 'h', 2, 2000)); if (L.type === 'rect') propsBox.append(geo('Arrondi', 'r', 0, 500)); }
    const sc = el('input', 'f'); sc.type = 'color'; sc.value = L.stroke; sc.onchange = () => { snap(); L.stroke = sc.value; changed(); };
    const sr = el('div', 'maProp'); sr.append(el('span', 'hint', 'Contour'), sc, el('span')); propsBox.append(sr, geo('Épaisseur', 'sw', 0, 40));
    propsBox.append(row(btn('Dupliquer', () => { snap(); const c = JSON.parse(JSON.stringify(L)); c.id = uid(); c.name = L.name + ' (copie)'; c.base.x += 12; c.base.y += 12; for (const k of ['x', 'y']) (c.keys[k] || []).forEach(q => q.v += 12); scene.layers.splice(scene.layers.indexOf(L) + 1, 0, c); sel = c.id; changed(); }),
      btn('Supprimer', () => { snap(); scene.layers.splice(scene.layers.indexOf(L), 1); sel = scene.layers.at(-1)?.id || null; selKeys = null; changed(); })));
    syncProps();
  }
  function syncProps() { const L = SL(); if (!L) return; for (const P of PROPS) { const [inp, kb] = propIns[P.k] || []; if (!inp) continue; const val = v(L, P.k); if (document.activeElement !== inp) inp.value = P.color ? val : r3(val); const on = !!keyAt(L, P.k); kb.textContent = on ? '◆' : L.keys[P.k]?.length ? '◈' : '◇'; kb.classList.toggle('maKey', on); } }
  function drawKey() {
    keyBox.replaceChildren(el('span', 'label', 'Image clé')); keyBox.style.display = selKeys ? '' : 'none';
    if (!selKeys) return;
    const q = selKeys.keys[0], es = el('select', 'f'); for (const e of EASES) { const o = el('option', '', e); o.value = e; es.append(o); } es.value = q.e || 'ease-in-out'; es.dataset.ease = '1';
    es.onchange = () => { snap(); for (const k of selKeys.keys) k.e = es.value; changed(); };
    keyBox.append(el('p', 'hint', (selKeys.k ? PROPS.find(P => P.k === selKeys.k).t : 'Toutes les propriétés') + ' à ' + fmtT(q.t) + '. L\'accélération règle le chemin depuis la clé d\'avant.'), row(es),
      row(btn('Supprimer la clé', () => { snap(); const L = selKeys.L; for (const [k, ks] of Object.entries(L.keys)) { L.keys[k] = ks.filter(x => !selKeys.keys.includes(x)); if (!L.keys[k].length) { L.base[k] = ks[0].v; delete L.keys[k]; } } selKeys = null; changed(); })));
  }
  // effets tout prêts, posés à partir de l'instant présent
  const FX = {
    'Apparition (fondu)': L => { addKey(L, 'op', T, 0); addKey(L, 'op', T + 500, 1, 'ease-out'); },
    'Disparition (fondu)': L => { addKey(L, 'op', T, 1); addKey(L, 'op', T + 500, 0, 'ease-in'); },
    'Entrée par la gauche': L => { const x = v(L, 'x'); addKey(L, 'x', T, -((L._w || 100) * v(L, 'scale')) / 2 - 10); addKey(L, 'x', T + 700, x, 'Rapide (expo-out)'); },
    'Entrée par la droite': L => { const x = v(L, 'x'); addKey(L, 'x', T, FORMATS[scene.fmt][0] + ((L._w || 100) * v(L, 'scale')) / 2 + 10); addKey(L, 'x', T + 700, x, 'Rapide (expo-out)'); },
    'Chute avec rebond': L => { const y = v(L, 'y'); addKey(L, 'y', T, -((L._h || 100) * v(L, 'scale'))); addKey(L, 'y', T + 900, y, 'Retour (back-out)'); },
    'Surgir (zoom)': L => { const s = v(L, 'scale'); addKey(L, 'scale', T, 0); addKey(L, 'scale', T + 600, s, 'Retour (back-out)'); },
    'Pulsation': L => { const s = v(L, 'scale'); addKey(L, 'scale', T, s); addKey(L, 'scale', T + 300, s * 1.18, 'ease-out'); addKey(L, 'scale', T + 600, s, 'ease-in'); },
    'Secousse': L => { const x = v(L, 'x'); [0, 1, 2, 3, 4, 5, 6].forEach(i => addKey(L, 'x', T + i * 60, i === 6 ? x : x + (i % 2 ? 10 : -10) * (1 - i / 7), 'linear')); },
    'Tour complet': L => { const r = v(L, 'rot'); addKey(L, 'rot', T, r); addKey(L, 'rot', T + 1000, r + 360, 'ease-in-out'); },
    'Flou vers net': L => { addKey(L, 'blur', T, 12); addKey(L, 'blur', T + 600, 0, 'ease-out'); addKey(L, 'op', T, 0); addKey(L, 'op', T + 400, 1, 'ease-out'); },
    'Changement de couleur': L => { const c = v(L, 'col'); addKey(L, 'col', T, c); addKey(L, 'col', T + 800, FILLS[(FILLS.indexOf(c) + 1) % FILLS.length] || '#ffd34f', 'ease-in-out'); },
    'Flottement': L => { const y = v(L, 'y'); addKey(L, 'y', T, y); addKey(L, 'y', T + 600, y - 14, 'Doux (sine-in-out)'); addKey(L, 'y', T + 1200, y, 'Doux (sine-in-out)'); },
  };
  function drawFx() {
    const s = el('select', 'f'); s.append(el('option', '', 'Effets tout prêts…')); for (const k in FX) { const o = el('option', '', k); o.value = k; s.append(o); }
    s.dataset.fx = '1'; s.onchange = () => { const L = SL(), f = FX[s.value]; s.selectedIndex = 0; if (!L) return toast('Choisis d\'abord un calque'); if (!f) return; snap(); f(L); if (scene.dur < T + 1300) scene.dur = Math.min(30000, Math.ceil((T + 1300) / 500) * 500); changed(); };
    fxBox.replaceChildren(el('span', 'label', 'Effets'), el('p', 'hint', 'Posés sur le calque choisi, à partir de l\'instant présent.'), s);
  }
  // ---------- export ----------
  function htmlOut(embed = false) {
    const [w, h] = FORMATS[scene.fmt], S = 50, css = [], divs = [];
    scene.layers.forEach((L, i) => {
      if (L.hidden) return; const c = 'mo-' + (i + 1), fr = [], blur = (L.keys.blur || []).length || L.base.blur > 0;
      for (let s = 0; s <= S; s++) { const t = s / S * scene.dur, q = k => v(L, k, t);
        fr.push(`  ${s * 100 / S}% { transform: translate(${r1(q('x'))}px, ${r1(q('y'))}px) translate(-50%, -50%) rotate(${r1(q('rot'))}deg) scale(${r3(q('scale'))}); opacity: ${r3(Math.max(0, Math.min(1, q('op'))))};${blur ? ` filter: blur(${r1(q('blur'))}px);` : ''} ${L.type === 'text' ? 'color' : 'background'}: ${q('col')}; }`); }
      const shape = L.type === 'text' ? `font: bold ${L.size}px ${L.font}; white-space: pre; line-height: 1.2; text-align: center;${L.sw ? ` -webkit-text-stroke: ${L.sw}px ${L.stroke};` : ''}`
        : `width: ${L.w}px; height: ${L.h}px;${L.type === 'rect' ? ` border-radius: ${L.r}px;` : L.type === 'circle' ? ' border-radius: 50%;' : L.type === 'tri' ? ' clip-path: polygon(50% 0, 93.3% 75%, 6.7% 75%);' : L.type === 'star' ? ' clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);' : ''}${L.sw && L.type !== 'tri' && L.type !== 'star' ? ` box-shadow: inset 0 0 0 ${L.sw}px ${L.stroke};` : ''}`;
      css.push(`.${c} { position: absolute; left: 0; top: 0; ${shape} animation: ${c} ${scene.dur}ms linear ${scene.loop ? 'infinite' : 'both'}; }\n@keyframes ${c} {\n${fr.join('\n')}\n}`);
      const esc = s => String(s).replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
      divs.push(L.type === 'text' ? `  <div class="${c}">${esc(L.text)}</div>` : L.type === 'image' ? `  <img class="${c}" src="${embed ? imgs.get(L.img)?.src || '' : 'ton-image.png'}" alt="">` : `  <div class="${c}"></div>`);
    });
    return `<style>\n.mo-scene { position: relative; width: ${w}px; height: ${h}px; background: ${scene.bg}; overflow: hidden; }\n.mo-scene img { background: none !important; }\n${css.join('\n')}\n</style>\n<div class="mo-scene">\n${divs.join('\n')}\n</div>\n`;
  }
  const dl = (blob, name) => { const a = el('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  async function exportVideo(download = true) {
    if (typeof MediaRecorder === 'undefined') { toast('Export impossible : pas d\'enregistreur vidéo ici.'); return null; }
    const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(t => MediaRecorder.isTypeSupported(t));
    play(false); exporting = true; const stream = stage.captureStream(60), r = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 8e6}), parts = [];
    r.ondataavailable = e => e.data.size && parts.push(e.data); const done = new Promise(ok => r.onstop = ok);
    seek(0); r.start(100); const t0 = performance.now();
    await new Promise(ok => { const f = now => { const t = now - t0; seek(Math.min(t, scene.dur)); if (t < scene.dur + 100 && view0.isConnected) requestAnimationFrame(f); else ok(); }; requestAnimationFrame(f); });
    r.stop(); await done; stream.getTracks().forEach(t => t.stop()); exporting = false; render();
    const blob = new Blob(parts, {type: 'video/webm'}); view0.__moLast = blob; if (download) dl(blob, 'animation-' + new Date().toISOString().slice(0, 10) + '.webm'); return blob;
  }
  function drawExp() {
    const fmt = el('select', 'f'); for (const k in FORMATS) { const o = el('option', '', {'16:9': 'Paysage 16:9', '9:16': 'Portrait 9:16', '1:1': 'Carré 1:1'}[k]); o.value = k; fmt.append(o); } fmt.value = scene.fmt;
    fmt.onchange = () => { snap(); scene.fmt = fmt.value; sizeStage(); changed(); };
    const bg = el('input', 'f'); bg.type = 'color'; bg.value = scene.bg; bg.oninput = () => { scene.bg = bg.value; render(); }; bg.onchange = () => { snap(); changed(); };
    const du = el('input', 'f'); du.type = 'number'; du.min = .5; du.max = 30; du.step = .5; du.value = scene.dur / 1000; du.title = 'Durée en secondes';
    du.onchange = () => { const s = parseFloat(du.value); if (isNaN(s)) return; snap(); scene.dur = Math.round(Math.max(.5, Math.min(30, s)) * 1000); changed(); };
    const lp = btn(scene.loop ? '⟳ En boucle' : '→ Une fois', () => { snap(); scene.loop = !scene.loop; changed(); }, 'btn px' + (scene.loop ? ' main' : ''));
    const vid = btn('Exporter en vidéo (WebM)', async () => { vid.disabled = true; vid.textContent = 'Enregistrement…'; await exportVideo(); vid.disabled = false; vid.textContent = 'Exporter en vidéo (WebM)'; toast('Vidéo enregistrée dans Téléchargements'); }, 'btn px main');
    expBox.replaceChildren(el('span', 'label', 'Scène et export'), row(fmt), row(el('span', 'hint', 'Fond'), bg, el('span', 'hint', 'Durée (s)'), du), row(lp), vid,
      row(btn('Copier HTML + CSS', () => navigator.clipboard.writeText(htmlOut()).then(() => toast('HTML et CSS copiés'), () => toast('Copie impossible'))),
        btn('Page .html', () => dl(new Blob([`<!doctype html><meta charset="utf-8"><title>Animation</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#111">\n${htmlOut(true)}`], {type: 'text/html'}), 'animation.html')),
        btn('Image PNG', () => { const was = exporting; exporting = true; render(); stage.toBlob(b => dl(b, 'image-' + Math.round(T) + 'ms.png')); exporting = was; render(); })));
  }
  function side() { drawLayers(); drawProps(); drawKey(); }
  function changed() { st.scene = scene; save(); side(); drawFx(); drawExp(); seek(T); }
  // ---------- mise en page ----------
  const view0 = el('div', 'maGrid'), left = el('div'), right = el('div', 'maSide');
  const toStart = btn('⏮', () => seek(0)), help = el('p', 'hint', 'Espace : lecture · Suppr : effacer · flèches : déplacer (Maj : ×10) · Ctrl+Z / Ctrl+Y : annuler / refaire · œil du calque : clic sur le ● de la timeline');
  left.append(stage, row(toStart, playB, timeL, btn('↶', () => restore(hist, redo)), btn('↷', () => restore(redo, hist))), tl, help);
  right.append(layersBox, propsBox, keyBox, fxBox, expBox); view0.append(left, right);
  view0.tabIndex = 0;
  view0.addEventListener('keydown', e => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    const L = SL();
    if (e.key === ' ') { e.preventDefault(); play(); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); restore(hist, redo); }
    else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); restore(redo, hist); }
    else if (e.key === 'Delete' || e.key === 'Backspace') { if (selKeys) keyBox.querySelector('button')?.click(); else if (L) { snap(); scene.layers.splice(scene.layers.indexOf(L), 1); sel = scene.layers.at(-1)?.id || null; changed(); } }
    else if (L && e.key.startsWith('Arrow')) { e.preventDefault(); const d = e.shiftKey ? 10 : 1, k = /Left|Right/.test(e.key) ? 'x' : 'y'; snap(); setVal(L, k, v(L, k) + (/Left|Up/.test(e.key) ? -d : d)); changed(); }
  });
  view0.addEventListener('dragover', e => e.preventDefault());
  view0.addEventListener('drop', async e => { e.preventDefault(); for (const f of e.dataTransfer?.files || []) if (/^image\//.test(f.type)) await addImage(f); });
  sizeStage(); side(); drawFx(); drawExp();
  new ResizeObserver(() => drawTl()).observe(tl);
  view0.__mo = {scene, newLayer, addImage, seek, play, v, valAt: (L, k, t) => v(L, k, t), htmlOut, exportVideo, fx: FX, get sel() { return SL(); }, setVal: (L, k, x) => { setVal(L, k, x); changed(); }, undo: () => restore(hist, redo), render};
  if (!scene.layers.length) {  // une première scène pour voir tout de suite comment ça marche
    autokey = false; const t = newLayer('text', {text: 'Motion', size: 64}); T = 0; FX['Chute avec rebond'](t);
    const s = newLayer('star', {w: 70, h: 70}); s.base.x = 150; s.base.y = 250; T = 800; FX['Surgir (zoom)'](s); T = 1400; FX['Tour complet'](s);
    const c = newLayer('circle', {w: 60, h: 60}); c.base.x = 490; c.base.y = 250; T = 1000; FX['Entrée par la droite'](c); T = 1800; FX['Pulsation'](c);
    autokey = true; hist.length = 0; T = 2000; changed();  // la première image montrée : la scène déjà en place
  }
  seek(T);
  return {root: view0, refresh: () => seek(T), stop: () => { play(false); cancelAnimationFrame(raf); }};
}
export default async function (ctx) {
  const view = ctx.view;
  if (!ctx.host) { view.textContent = "Ce plugin doit être approuvé par NeoDex pour s'ouvrir."; return; }
  const { el, toast } = ctx.host;
  ctx.host.addStyle(CSS);
  // vérification : les préréglages CSS connus, et le ressort finit bien à 1
  { const e = bezier(PRESETS.ease), io = bezier(PRESETS['ease-in-out']), s = spring({mass: 1, stiffness: 170, damping: 26, velocity: 0});
    console.assert(Math.abs(e(.5) - .8024) < 2e-3 && Math.abs(io(.5) - .5) < 1e-3 && Math.abs(bezier([0, 0, 1, 1])(.3) - .3) < 1e-6, 'motion : bézier');
    console.assert(Math.abs(s.fn(1) - 1) < 1e-9 && s.dur > .3 && s.dur < 3 && Math.abs(s.fn(.999) - 1) < .01, 'motion : ressort'); }
  let data = null; try { data = await ctx.folder.read('motion'); } catch {}
  const blank = i => ({kind: 'bezier', pts: [...[PRESETS.ease, PRESETS['Retour (back-out)'], PRESETS['ease-in']][i]], spring: {mass: 1, stiffness: 180, damping: 12, velocity: 0}, on: true});
  const st = {curves: data?.curves?.length === 3 ? data.curves : [0, 1, 2].map(blank), cur: data?.cur || 0, dur: data?.dur || 1000, loop: data?.loop ?? true, saved: data?.saved || [], scene: data?.scene || null, mode: data?.mode || 'anim'};
  let saveT = 0; const save = () => { clearTimeout(saveT); saveT = setTimeout(() => ctx.folder.write('motion', st).catch(() => {}), 400); };
  const fnOf = c => c.kind === 'spring' ? spring(c.spring).fn : bezier(c.pts);
  // ---------- l'interface ----------
  view.innerHTML = '';
  const wrap = el('div', 'appWrap'), head = el('div', 'agHead'), lay = el('div', 'moGrid'), left = el('div', 'sysCard px'), right = el('div');
  head.append(el('span', 'label', 'Motion · courbes d\'animation')); lay.append(left, right); wrap.append(head, lay); view.append(wrap);
  const curveList = el('div'), tabs = el('div', 'moTabs'), can = el('canvas', 'moCan'), g = can.getContext('2d'), editor = el('div');
  can.width = 340; can.height = 340; can.id = 'mo_canvas';
  left.append(el('span', 'label', 'Courbes'), curveList, tabs, can, editor);
  const stage = el('div', 'moStage'), ctrl = el('div', 'moRow'), cssTitle = el('span', 'label', 'CSS'), code = el('div', 'moCode'), copy = el('button', 'btn px', 'Copier le CSS');
  code.id = 'mo_css'; code.translate = false;
  const play = el('button', 'btn px main', '▶ Rejouer'), dur = el('input', 'moRange'), durL = el('span', 'hint'), loopB = el('button', 'btn px');
  dur.type = 'range'; dur.min = 200; dur.max = 4000; dur.step = 50; dur.value = st.dur; dur.title = 'Durée';
  ctrl.append(play, el('span', 'hint', 'Durée'), dur, durL, loopB);
  const lanes = ['translateX', 'scale', 'rotate', 'opacity'].map((p, i) => { const l = el('div', 'moLane'); l.style.top = [0, 104, 166, 228][i] + 'px'; if (!i) l.style.height = '98px'; const lab = el('span', 'hint', p); lab.style.cssText = 'position:absolute;right:8px;bottom:2px'; lab.translate = false; l.append(lab); stage.append(l); return {p, l, boxes: []}; });
  right.append(stage, ctrl, cssTitle, code, copy);
  // une boîte par courbe active et par propriété
  function makeBoxes() { for (const L of lanes) { L.boxes.forEach(b => b.remove()); L.boxes = st.curves.map((c, i) => { const b = el('div', 'moBox'); b.style.background = COLORS[i]; b.style.display = c.on ? '' : 'none'; if (L.p !== 'translateX') b.style.left = 14 + i * 60 + 'px'; else b.style.top = 6 + i * 30 + 'px'; L.l.append(b); return b; }); } }
  // ---------- l'éditeur de la courbe ----------
  // repère : x de 0 à 1 sur 40..300, y de -0,5 à 1,5 sur 320..20 (pour voir les dépassements)
  const X = x => 40 + x * 260, Y = y => 245 - y * 150, iX = px => (px - 40) / 260, iY = py => (245 - py) / 150;
  function drawCurve() {
    g.fillStyle = '#0b0816'; g.fillRect(0, 0, 340, 340);
    g.fillStyle = '#1a1430'; for (let k = 0; k <= 10; k++) { g.fillRect(X(k / 10), Y(1.5), 1, Y(-.6) - Y(1.5)); }
    g.fillStyle = '#3a2f5a'; g.fillRect(X(0), Y(0), 260, 1); g.fillRect(X(0), Y(1), 260, 1); g.fillRect(X(0), Y(1.5), 1, Y(-.6) - Y(1.5));
    g.font = '10px monospace'; g.fillStyle = '#8a7aa8'; g.fillText('0', 28, Y(0) + 3); g.fillText('1', 28, Y(1) + 3); g.fillText('temps →', 250, 335);
    st.curves.forEach((c, i) => { if (!c.on && i !== st.cur) return; const f = fnOf(c); g.strokeStyle = COLORS[i]; g.globalAlpha = i === st.cur ? 1 : .45; g.lineWidth = i === st.cur ? 3 : 2; g.beginPath(); for (let k = 0; k <= 200; k++) { const x = k / 200; k ? g.lineTo(X(x), Y(f(x))) : g.moveTo(X(x), Y(f(x))); } g.stroke(); });
    g.globalAlpha = 1;
    const c = st.curves[st.cur];
    if (c.kind === 'bezier') { const [x1, y1, x2, y2] = c.pts; g.strokeStyle = '#c8b8f0'; g.lineWidth = 1; g.beginPath(); g.moveTo(X(0), Y(0)); g.lineTo(X(x1), Y(y1)); g.moveTo(X(1), Y(1)); g.lineTo(X(x2), Y(y2)); g.stroke();
      for (const [x, y] of [[x1, y1], [x2, y2]]) { g.fillStyle = '#000'; g.fillRect(X(x) - 7, Y(y) - 7, 14, 14); g.fillStyle = COLORS[st.cur]; g.fillRect(X(x) - 5, Y(y) - 5, 10, 10); } }
    if (playT !== null) { const p = Math.min(1, playT); g.fillStyle = '#fff'; g.fillRect(X(p) - 1, Y(1.5), 2, Y(-.6) - Y(1.5)); }
  }
  let dragH = -1;
  const cpos = e => { const r = can.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 340, (e.clientY - r.top) / r.height * 340]; };
  can.onpointerdown = e => { const c = st.curves[st.cur]; if (c.kind !== 'bezier') return; const [x, y] = cpos(e); const d = [0, 1].map(h => Math.hypot(x - X(c.pts[h * 2]), y - Y(c.pts[h * 2 + 1])));
    dragH = d[0] < d[1] ? (d[0] < 20 ? 0 : -1) : (d[1] < 20 ? 1 : -1); if (dragH >= 0) try { can.setPointerCapture(e.pointerId); } catch {} };
  can.onpointermove = e => { if (dragH < 0) return; const [x, y] = cpos(e), c = st.curves[st.cur]; c.pts[dragH * 2] = r3(Math.max(0, Math.min(1, iX(x)))); c.pts[dragH * 2 + 1] = r3(Math.max(-.6, Math.min(1.6, iY(y)))); update(); };
  can.onpointerup = () => { if (dragH >= 0) { dragH = -1; save(); replay(); } };
  function drawList() {
    curveList.replaceChildren(...st.curves.map((c, i) => { const row = el('div', 'moCurve'), sw = el('i'), b = el('button', 'btn px' + (i === st.cur ? ' main' : ''), ['Courbe rose', 'Courbe bleue', 'Courbe jaune'][i]), eye = el('button', 'btn px', c.on ? '◉' : '○');
      sw.style.background = COLORS[i]; eye.style.flex = 'none'; eye.title = 'Montrer dans l\'aperçu'; b.onclick = () => { st.cur = i; c.on = true; save(); full(); }; eye.onclick = () => { c.on = !c.on; save(); full(); }; row.append(sw, b, eye); return row; }));
    const c = st.curves[st.cur];
    tabs.replaceChildren(...[['bezier', 'Bézier'], ['spring', 'Ressort']].map(([k, t]) => { const b = el('button', 'btn px' + (c.kind === k ? ' main' : ''), t); b.dataset.kind = k; b.onclick = () => { c.kind = k; save(); full(); }; return b; }));
    editor.replaceChildren();
    if (c.kind === 'bezier') {
      const nums = el('div', 'moRow'), inputs = [0, 1, 2, 3].map(k => { const n = el('input', 'f'); n.type = 'number'; n.step = .01; n.value = c.pts[k]; n.title = ['x1', 'y1', 'x2', 'y2'][k]; n.oninput = () => { const v = parseFloat(n.value); if (!isNaN(v)) { c.pts[k] = k % 2 ? Math.max(-2, Math.min(3, v)) : Math.max(0, Math.min(1, v)); update(); save(); } }; return n; });
      nums.append(...inputs); editor._inputs = inputs;
      const pre = el('select', 'f'); pre.append(el('option', '', 'Préréglages…')); for (const k of Object.keys(PRESETS)) { const o = el('option', '', k); o.value = k; pre.append(o); }
      for (const [i, s] of st.saved.entries()) { const o = el('option', '', '★ ' + s.name); o.value = 'saved:' + i; pre.append(o); }
      pre.onchange = () => { const v = pre.value; const p = v.startsWith('saved:') ? st.saved[+v.slice(6)]?.pts : PRESETS[v]; if (p) { c.pts = [...p]; save(); full(); replay(); } };
      const keep = el('button', 'btn px', '★ Garder'); keep.title = 'Ajouter cette courbe aux préréglages';
      keep.onclick = () => { const name = 'cubic-bezier(' + c.pts.join(', ') + ')'; if (!st.saved.some(s => s.pts.join() === c.pts.join())) { st.saved.push({name, pts: [...c.pts]}); st.saved = st.saved.slice(-12); save(); full(); toast('Courbe gardée dans les préréglages'); } };
      const row = el('div', 'moRow'); row.append(pre, keep);
      editor.append(el('p', 'hint', 'Glisse les deux poignées. Une poignée au-dessus de 1 ou sous 0 fait dépasser l\'animation.'), nums, row);
    } else {
      for (const [k, t, mn, mx, stp] of [['mass', 'Masse', .1, 5, .1], ['stiffness', 'Raideur', 10, 500, 5], ['damping', 'Amortissement', 1, 60, 1], ['velocity', 'Vitesse de départ', -20, 20, 1]]) {
        const row = el('div', 'moRow'), r = el('input', 'moRange'), v = el('span', 'hint', String(c.spring[k])); r.type = 'range'; r.min = mn; r.max = mx; r.step = stp; r.value = c.spring[k]; r.dataset.k = k;
        r.oninput = () => { c.spring[k] = +r.value; v.textContent = r.value; update(); }; r.onchange = () => { save(); replay(); };
        const lab = el('span', 'hint', t); lab.style.width = '120px'; row.append(lab, r, v); editor.append(row);
      }
      const sp = spring(c.spring), n = el('p', 'hint'); n.append(el('span', '', 'Durée naturelle :'), ' ' + Math.round(sp.dur * 1000) + ' ms. ', el('span', '', 'Peu d\'amortissement : ça rebondit ; beaucoup : ça glisse sans dépasser.')); editor.append(n);
    }
  }
  // ---------- le CSS ----------
  function cssOf(c, i) {
    if (c.kind === 'bezier') return `cubic-bezier(${c.pts.join(', ')})`;
    const {fn} = spring(c.spring), pts = []; for (let k = 0; k <= 40; k++) pts.push(r3(fn(k / 40)));
    return `linear(${pts.join(', ')})`;  // linear() : la courbe du ressort échantillonnée en 41 points (Chrome 113+, Firefox 112+, Safari 17.2+)
  }
  function drawCss() {
    const c = st.curves[st.cur], tf = cssOf(c), d = c.kind === 'spring' ? Math.round(spring(c.spring).dur * 1000) : st.dur;
    code.textContent = `/* transition */\n.element {\n  transition: transform ${d}ms ${tf};\n}\n\n/* animation */\n@keyframes glisse {\n  from { transform: translateX(0); }\n  to   { transform: translateX(200px); }\n}\n.element {\n  animation: glisse ${d}ms ${tf} both;\n}`;
  }
  copy.onclick = () => { navigator.clipboard.writeText(code.textContent).then(() => toast('CSS copié'), () => toast('Copie impossible')); };
  // ---------- l'aperçu ----------
  let playT = null, t0 = 0, raf = 0, fns = [];
  function replay() { fns = st.curves.map(c => ({f: fnOf(c), d: c.kind === 'spring' ? spring(c.spring).dur * 1000 : st.dur})); t0 = performance.now(); playT = 0; cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); }
  function frame(now) {
    if (!view.isConnected) return;
    const span = Math.max(...fns.map((f, i) => st.curves[i].on ? f.d : 0), st.dur), el2 = now - t0;
    st.curves.forEach((c, i) => { const p = Math.min(1, el2 / fns[i].d), v = fns[i].f(p), W = stage.clientWidth - 60;
      lanes[0].boxes[i].style.transform = `translateX(${v * W}px)`;
      lanes[1].boxes[i].style.transform = `scale(${.4 + v * .8})`; lanes[2].boxes[i].style.transform = `rotate(${v * 180}deg)`; lanes[3].boxes[i].style.opacity = Math.max(0, Math.min(1, v)); });
    playT = el2 / fns[st.cur].d; drawCurve();
    if (el2 < span + 500) raf = requestAnimationFrame(frame);
    else if (st.loop) { t0 = now; raf = requestAnimationFrame(frame); } else { playT = null; drawCurve(); }
  }
  play.onclick = replay;
  dur.oninput = () => { st.dur = +dur.value; durL.textContent = st.dur + ' ms'; drawCss(); }; dur.onchange = () => { save(); replay(); };
  const drawLoop = () => { loopB.textContent = st.loop ? '⟳ En boucle' : '→ Une fois'; loopB.classList.toggle('main', st.loop); };
  loopB.onclick = () => { st.loop = !st.loop; drawLoop(); save(); replay(); };
  function update() { if (editor._inputs && st.curves[st.cur].kind === 'bezier') editor._inputs.forEach((n, k) => { if (document.activeElement !== n) n.value = st.curves[st.cur].pts[k]; }); drawCurve(); drawCss(); fns = st.curves.map(c => ({f: fnOf(c), d: c.kind === 'spring' ? spring(c.spring).dur * 1000 : st.dur})); }
  function full() { drawList(); makeBoxes(); update(); }
  durL.textContent = st.dur + ' ms'; drawLoop(); full(); replay();
  // les deux modes : Animer (calques et images clés) et Courbes (l'éditeur ci-dessus, dont les courbes servent aussi d'accélérations)
  const anim = await animator(ctx, {el, toast, st, fnOf, save}), aw = el('div', 'appWrap'), modes = el('div', 'moTabs');
  aw.append(anim.root);
  const mb = [['anim', '🎬 Animer'], ['curves', '〰 Courbes']].map(([k, t]) => { const b = el('button', 'btn px', t); b.dataset.mode = k; b.onclick = () => setMode(k); return b; });
  function setMode(k) { st.mode = k; aw.style.display = k === 'anim' ? '' : 'none'; wrap.style.display = k === 'curves' ? '' : 'none'; mb.forEach(b => b.classList.toggle('main', b.dataset.mode === k)); if (k === 'anim') anim.refresh(); save(); }
  modes.append(...mb); view.replaceChildren(modes, aw, wrap); setMode(st.mode);
  ctx.onClose?.(() => { cancelAnimationFrame(raf); anim.stop(); });
}
