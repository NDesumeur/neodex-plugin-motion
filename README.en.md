# Motion

Tune your animation curves and watch them move, then copy the CSS.

*Version française : [README.md](README.md)*

![Motion](screenshots/1.jpg)

## Three curves to compare

Pink, blue and yellow: click a curve to tune it, **◉ / ○** to show or hide it in the preview. The preview plays them side by side on 4 properties: a move, a scale, a rotation and a fade. **▶ Replay**, the **duration** (200 ms to 4 s), **looping** or **once**.

## Bézier

Drag the two handles on the graph, or type their values. A handle above 1 or below 0 makes the animation overshoot (a bounce, a wind-up). 10 presets (the CSS ones, plus back, wind-up, fast, gentle, sharp), and **★ Keep** adds your curve to the list.

## Spring

Mass, stiffness, damping and initial velocity: little damping, it bounces; a lot, it glides without overshooting. The duration is the spring's time to rest.

## The CSS

Ready to copy: a `transition` and a `@keyframes` with the curve. Bézier gives `cubic-bezier(…)`; the spring gives `linear(…)`, its curve sampled at 41 points (Chrome 113+, Firefox 112+, Safari 17.2+).

## Data

The 3 curves, the duration and your presets are kept in the plugin folder. Permission: `storage` only.
