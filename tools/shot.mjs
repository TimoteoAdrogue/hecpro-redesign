// usage: node tools/shot.mjs <url> <out.png> [width] [height] [scheme] [fullPage]
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const [url, out, w = 1440, h = 900, scheme = 'light', full = '0'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, colorScheme: scheme, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.goto(url, { waitUntil: 'load' });
await p.waitForTimeout(+(process.env.WAIT || 800));
await p.screenshot({ path: out, fullPage: full === '1' });
await b.close();
