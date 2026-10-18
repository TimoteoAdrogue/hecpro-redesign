// usage: node tools/logo-sheet.mjs <outdir>   (server on 127.0.0.1:8731 must be running)
// Per direction: lab sheet + the lockup injected into the real header (desktop, phone, dark) and footer.
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const out = process.argv[2], B = 'http://127.0.0.1:8731/';
const b = await chromium.launch({ channel: 'chrome' });
for (const d of ['d1', 'd2', 'd3']) {
  let p = await (await b.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 })).newPage();
  await p.goto(`${B}lab/logo/sheet.html?d=${d}`, { waitUntil: 'load' }); await p.waitForTimeout(900);
  await p.screenshot({ path: `${out}/${d}-sheet.png`, fullPage: true });
  for (const [w, h, scheme, tag] of [[1440, 900, 'light', 'hd'], [390, 844, 'light', 'hm'], [1440, 900, 'dark', 'hk']]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: 1, isMobile: w < 768, reducedMotion: 'reduce' });
    p = await ctx.newPage();
    await p.goto(B, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    await p.evaluate(([d, dark]) => document.querySelectorAll('.brand').forEach((el, i) => {
      el.innerHTML = `<img src="lab/logo/${d}-lockup${dark ? '-dark' : ''}.svg" style="height:${i ? 38 : 30}px;width:auto;display:block" alt="HECPro">`;
    }), [d, scheme === 'dark']);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${out}/${d}-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 72 } });
    if (tag === 'hd') {
      await p.evaluate(() => document.querySelector('.foot').scrollIntoView({ block: 'end' })); await p.waitForTimeout(500);
      const r = await p.evaluate(() => { const b = document.querySelector('.foot').getBoundingClientRect(); return { y: b.top, h: b.height }; });
      await p.screenshot({ path: `${out}/${d}-ft.png`, clip: { x: 0, y: Math.max(0, r.y), width: w, height: Math.min(200, r.h) } });
    }
    await ctx.close();
  }
}
await b.close();
