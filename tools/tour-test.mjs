// Scroll the pinned fiche tour to each label (forward, then backward) and report the visible caption + camera.
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const url = process.env.URL || 'file:///Users/adroguetimoteo/Documents/PROJECTS/hecpro-redesign/index.html';
const out = process.argv[2];
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const p = await (await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 })).newPage();
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const labels = await p.evaluate(() => { const st = ScrollTrigger.getAll()[0]; const tl = st.animation;
    return Object.entries(tl.labels).sort((a, b) => a[1] - b[1]).map(([k, t]) => ({ k, y: Math.round(st.start + (st.end - st.start) * t / tl.duration()) })); });
  const seq = [...labels, ...labels.slice(0, -1).reverse()];
  const rows = [];
  for (const [n, l] of seq.entries()) {
    await p.evaluate(y => scrollTo(0, y), l.y); await p.waitForTimeout(1200);
    if (out && n < labels.length) await p.screenshot({ path: `${out}/tour-${w}-${l.k}.png` });
    rows.push(await p.evaluate(k => {
      const vis = [...document.querySelectorAll('.tour__steps li')].map((li, i) => [i, +getComputedStyle(li).opacity]).filter(([, o]) => o > .5).map(([i]) => i);
      const cam = getComputedStyle(document.querySelector('[data-cam]')).transform;
      const dock = document.querySelector('[data-dock]').classList.contains('is-on');
      return `${k}: visible=${vis} cam=${cam.slice(7, 40)} dock=${dock}`;
    }, l.k));
  }
  console.log(w + 'px\n  ' + rows.join('\n  '));
}
await b.close();
