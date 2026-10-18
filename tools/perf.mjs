// usage: URL=<url> node tools/perf.mjs  ->  LCP / CLS on the hero, Fast 4G (9 Mb/s, 60 ms) and 4x CPU on phone, 3 runs each
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const url = process.env.URL || 'http://127.0.0.1:8731/';
const b = await chromium.launch({ channel: 'chrome' });
for (const [w, h, cpu] of [[390, 844, 4], [1440, 900, 1]]) {
  const runs = [];
  for (let i = 0; i < 3; i++) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
    const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu });
    await p.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0; window.__lcpEl = ''; window.__h1 = 0;
      const poll = () => { const h = document.querySelector('.hero h1'); if (h && +getComputedStyle(h).opacity > .5 && (h.querySelector('.ln') ? +getComputedStyle(h.querySelector('.ln')).transform.split(',')[5]?.replace(')', '') < 20 : true)) window.__h1 = performance.now(); else requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
      new PerformanceObserver(l => l.getEntries().forEach(e => { window.__lcp = e.startTime; window.__lcpEl = (e.element?.tagName || '') + '.' + (e.element?.className || '') + ' ' + (e.url || '').split('/').pop(); })).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(l => l.getEntries().forEach(e => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
    });
    await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(4000);
    runs.push(await p.evaluate(() => ({ lcp: Math.round(window.__lcp), h1: Math.round(window.__h1), cls: +window.__cls.toFixed(3), el: window.__lcpEl })));
    await ctx.close();
  }
  console.log(`${w}px`, JSON.stringify(runs));
}
await b.close();
