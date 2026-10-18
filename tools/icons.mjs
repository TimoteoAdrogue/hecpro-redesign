// Renders the PNG icons from assets/logo/*.svg (run after tools/logo.py apply; server on 127.0.0.1:8731).
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const B = 'http://127.0.0.1:8731/';
const b = await chromium.launch({ channel: 'chrome' });
const shot = async (html, size, path, transparent = false) => {
  const p = await (await b.newContext({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })).newPage();
  await p.goto(B + 'index.html'); // same origin so relative URLs resolve
  await p.setContent(`<base href="${B}"><style>html,body{margin:0;width:${size}px;height:${size}px;background:${transparent ? 'transparent' : '#0ABAB5'}}img{display:block;width:100%;height:100%}</style>${html}`);
  await p.waitForTimeout(300);
  await p.screenshot({ path, omitBackground: transparent });
  await p.close();
};
await shot('<img src="assets/logo/tile.svg">', 32, 'favicon-32.png', true);
await shot('<img src="assets/logo/tile.svg">', 180, 'apple-touch-icon.png');           // square, iOS rounds it
await shot('<img src="assets/logo/tile.svg">', 1080, 'assets/logo/avatar-1080.png');    // Instagram crops the circle
// share image: the real hero, with the new header
const p = await (await b.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })).newPage();
await p.goto(B, { waitUntil: 'load' }); await p.waitForTimeout(2500);
await p.screenshot({ path: '/tmp/og.png' });
await b.close();
