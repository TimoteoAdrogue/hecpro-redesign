// usage: node tools/sections.mjs <outdir> <width> <height> [query]
// Scrolls to each section, lets motion settle, saves one viewport shot per section.
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, w, h, q = ''] = process.argv.slice(2);
const url = (process.env.URL || 'file:///Users/adroguetimoteo/Documents/PROJECTS/hecpro-redesign/index.html') + q;
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const mobile = +w < 768;
const p = await (await b.newContext({ viewport: { width: +w, height: +h }, isMobile: mobile, hasTouch: mobile })).newPage();
await p.goto(url, { waitUntil: 'load' });
await p.waitForFunction(() => window.ScrollTrigger, null, { timeout: 15000 }).catch(() => console.log('no ScrollTrigger: CDN slow?'));
await p.waitForTimeout(3200);
await p.screenshot({ path: `${out}/01-hero.png` });
const spots = [['02-constat', '#constat', 0], ['03-tour', 'tour', 3], ['04-matieres', '#matieres', 0], ['05-methode', '#methode', 0],
  ['06-packs', '#packs', 0], ['07-packs2', '.packs__grid', -80], ['08-coaching', '#coaching', 0], ['09-avis', '#avis', 0], ['10-faq', '#faq', 0], ['11-closing', '.closing', 0], ['12-foot', '.foot', 0]];
for (const [name, sel, off] of spots) {
  if (sel === 'tour') {
    await p.evaluate(i => { const st = ScrollTrigger.getAll().find(s => s.pin); if (!st) return document.querySelector('#apercu').scrollIntoView();
      const tl = st.animation; scrollTo(0, st.start + (st.end - st.start) * tl.labels['s' + i] / tl.duration() + 2); }, off);
  } else {
    // walk down in steps so scroll-triggered effects fire on the way
    const target = await p.evaluate(([s, o]) => document.querySelector(s).getBoundingClientRect().top + scrollY + o - (innerWidth < 768 ? 60 : 64), [sel, off]);
    const from = await p.evaluate(() => scrollY);
    for (let k = 1; k <= 6; k++) { await p.evaluate(y => scrollTo(0, y), from + (target - from) * k / 6); await p.waitForTimeout(120); }
  }
  await p.waitForTimeout(2600);
  await p.screenshot({ path: `${out}/${name}.png` });
}
await b.close();
