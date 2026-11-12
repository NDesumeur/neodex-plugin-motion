// lancé par le test « local » de NeoDex : le mode Animer (calques, images clés, effet, accélération, annuler, export HTML et vidéo), puis le mode Courbes
module.exports = async ({ pj, sleep }) => {
  const run = async code => { const r = await pj(code); if (r && r.err) throw new Error(r.err); return r; };
  await sleep(600);
  const a = await run(`(async () => { try {
    const mo = document.querySelector('.maGrid').__mo, sc = mo.scene;
    if (sc.layers.length < 3) return {err: 'scène de départ : ' + sc.layers.length + ' calques'};
    let L = mo.newLayer('rect', {w: 40, h: 40}); mo.seek(0); mo.setVal(L, 'x', 100); mo.seek(1000); mo.setVal(L, 'x', 300);
    if (L.keys.x.length !== 2) return {err: 'images clés : ' + JSON.stringify(L.keys.x)};
    const mid = mo.valAt(L, 'x', 500); if (!(mid > 150 && mid < 250)) return {err: 'milieu ease-in-out : ' + mid};
    L.keys.x[1].e = 'linear'; if (Math.abs(mo.valAt(L, 'x', 500) - 200) > .01) return {err: 'linéaire : ' + mo.valAt(L, 'x', 500)};
    L.keys.x[1].e = 'Saut'; if (mo.valAt(L, 'x', 999) !== 100) return {err: 'saut : ' + mo.valAt(L, 'x', 999)};
    mo.seek(0); mo.setVal(L, 'col', '#000000'); mo.seek(1000); mo.setVal(L, 'col', '#ffffff'); L.keys.col[1].e = 'linear';
    if (mo.valAt(L, 'col', 500) !== '#808080') return {err: 'couleur : ' + mo.valAt(L, 'col', 500)};
    mo.seek(1200); const fs = document.querySelector('[data-fx]'); fs.value = 'Pulsation'; fs.dispatchEvent(new Event('change')); if ((L.keys.scale || []).length !== 3) return {err: 'effet pulsation'};
    const n = sc.layers.length, id = L.id; mo.undo(); if (sc.layers.length !== n) return {err: 'annuler a retiré un calque'};
    L = sc.layers.find(x => x.id === id); if ((L.keys.scale || []).length) return {err: 'annuler : la pulsation est restée'};
    const html = mo.htmlOut(); if (!html.includes('@keyframes mo-4') || !html.includes('50% { transform: translate(')) return {err: 'HTML : ' + html.slice(0, 200)};
    // un clic sur le carré dans la scène le choisit, un glissé le déplace
    const st = document.querySelector('.maStage'), r = st.getBoundingClientRect(), k = r.width / 640; mo.seek(0); const x0 = mo.valAt(L, 'x', 0), y0 = mo.valAt(L, 'y', 0);
    const P = (x, y) => ({clientX: r.left + x * k, clientY: r.top + y * k, bubbles: true, pointerId: 3});
    st.dispatchEvent(new PointerEvent('pointerdown', P(x0, y0))); st.dispatchEvent(new PointerEvent('pointermove', P(x0 + 20, y0 + 10))); st.dispatchEvent(new PointerEvent('pointerup', P(x0 + 20, y0 + 10)));
    if (mo.sel !== L || Math.round(mo.valAt(L, 'x', 0)) !== Math.round(x0 + 20)) return {err: 'glisser dans la scène : ' + mo.valAt(L, 'x', 0) + ' au lieu de ' + (x0 + 20)};
    sc.dur = 600; const v = await mo.exportVideo(false); if (!v || v.size < 2000) return {err: 'vidéo : ' + (v && v.size)};
    return {ok: 1, size: v.size};
  } catch (e) { return {err: e.message + ' ' + e.stack}; } })()`);
  // le mode Courbes, comme avant
  await pj(`document.querySelector('[data-mode=curves]').click(), 0`); await sleep(200);
  const css = () => pj(`document.getElementById('mo_css').textContent`);
  await pj(`(() => { const s = [...document.querySelectorAll('select')].find(s => s.options[0].textContent.startsWith('Préréglages')); s.value = 'ease-in-out'; s.dispatchEvent(new Event('change')); })(), 0`); await sleep(100);
  if (!/cubic-bezier\(0\.42, 0, 0\.58, 1\)/.test(await css())) throw new Error('préréglage : ' + await css());
  await pj(`(() => { const c = document.getElementById('mo_canvas'), r = c.getBoundingClientRect(), k = r.width / 340, P = (x, y) => ({clientX: r.left + (40 + x * 260) * k, clientY: r.top + (245 - y * 150) * k, bubbles: true, pointerId: 1});
    c.dispatchEvent(new PointerEvent('pointerdown', P(.42, 0))); c.dispatchEvent(new PointerEvent('pointermove', P(.1, 1.2))); c.dispatchEvent(new PointerEvent('pointerup', P(.1, 1.2))); })(), 0`); await sleep(100);
  const m = /cubic-bezier\(([0-9.]+), ([0-9.]+),/.exec(await css());
  if (!m || Math.abs(m[1] - .1) > .02 || Math.abs(m[2] - 1.2) > .02) throw new Error('poignée : ' + await css());
  await pj(`document.querySelector('[data-kind=spring]').click(), 0`); await sleep(100);
  const s = await css(), pts = /linear\(([^)]*)\)/.exec(s);
  if (!pts || pts[1].split(',').length !== 41 || !/, 1$/.test(pts[1])) throw new Error('ressort : ' + s);
  await pj(`document.querySelector('[data-mode=anim]').click(), 0`); await sleep(400);
  return 'animer : images clés, accélérations, couleur, effet, glisser, HTML, vidéo ' + Math.round(a.size / 1000) + ' ko ; courbes : préréglage, poignée, ressort ok';
};
