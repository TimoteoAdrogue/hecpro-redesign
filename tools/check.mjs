// usage: node tools/check.mjs <outdir> [width] [height] [scheme] [reduced]
// Walks the page with real wheel scrolls, saves viewport shots, prints overflow + console errors.
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, w = 1440, h = 900, scheme = 'light', reduced = '0'] = process.argv.slice(2);
const url = process.env.URL || 'file:///Users/adroguetimoteo/Documents/PROJECTS/hecpro-redesign/index.html';
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, reducedMotion: reduced === '1' ? 'reduce' : 'no-preference', isMobile: +w < 768, hasTouch: +w < 768 });
const p = await ctx.newPage();
const errs = [];
p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); });
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(1800);
const total = await p.evaluate(() => document.documentElement.scrollHeight);
const stepPx = +h * 0.85;
let i = 0;
for (let y = 0; y < total + stepPx; y += stepPx) {
  await p.evaluate(y => window.scrollTo(0, y), y);
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${String(i++).padStart(2, '0')}.png` });
  const now = await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 2);
  if (now) break;
}
const ov = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, h: document.documentElement.scrollHeight,
  wide: [...document.querySelectorAll('body *')].filter(e => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.avis__row') && !e.closest('.hero__desk') && !e.closest('.tour__win') && !e.closest('dialog'); }).slice(0, 8).map(e => e.tagName + '.' + e.className + ' ' + Math.round(e.getBoundingClientRect().right)) }));
console.log(JSON.stringify({ shots: i, ...ov, errs }, null, 1));
await b.close();
