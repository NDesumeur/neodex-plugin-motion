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
  const st = {curves: data?.curves?.length === 3 ? data.curves : [0, 1, 2].map(blank), cur: data?.cur || 0, dur: data?.dur || 1000, loop: data?.loop ?? true, saved: data?.saved || []};
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
  ctx.onClose?.(() => cancelAnimationFrame(raf));
}
