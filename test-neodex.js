// lancé par le test « local » de NeoDex : préréglage ease-in-out, une poignée glissée, le ressort et son linear()
module.exports = async ({ pj, sleep }) => {
  const css = () => pj(`document.getElementById('mo_css').textContent`);
  await sleep(500);
  await pj(`(() => { const s = [...document.querySelectorAll('select')].find(s => s.options[0].textContent.startsWith('Préréglages')); s.value = 'ease-in-out'; s.dispatchEvent(new Event('change')); })(), 0`); await sleep(100);
  if (!/cubic-bezier\(0\.42, 0, 0\.58, 1\)/.test(await css())) throw new Error('préréglage : ' + await css());
  // la poignée 1 est en (0,42 ; 0) : on la glisse vers (0,1 ; 1,2)
  await pj(`(() => { const c = document.getElementById('mo_canvas'), r = c.getBoundingClientRect(), k = r.width / 340, P = (x, y) => ({clientX: r.left + (40 + x * 260) * k, clientY: r.top + (245 - y * 150) * k, bubbles: true, pointerId: 1});
    c.dispatchEvent(new PointerEvent('pointerdown', P(.42, 0))); c.dispatchEvent(new PointerEvent('pointermove', P(.1, 1.2))); c.dispatchEvent(new PointerEvent('pointerup', P(.1, 1.2))); })(), 0`); await sleep(100);
  const m = /cubic-bezier\(([0-9.]+), ([0-9.]+),/.exec(await css());
  if (!m || Math.abs(m[1] - .1) > .02 || Math.abs(m[2] - 1.2) > .02) throw new Error('poignée : ' + await css());
  await pj(`document.querySelector('[data-kind=spring]').click(), 0`); await sleep(100);
  const s = await css(), pts = /linear\(([^)]*)\)/.exec(s);
  if (!pts || pts[1].split(',').length !== 41 || !/, 1$/.test(pts[1])) throw new Error('ressort : ' + s);
  await sleep(800);
  return 'préréglage, poignée, ressort et CSS ok';
};
