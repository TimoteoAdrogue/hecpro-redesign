// usage: URL=<url> node tools/fluid.mjs [width] [height] [cpu] [net]
// Wheel-scrolls the whole page like a person and reports: frame gaps (jank), long tasks,
// and every image that was on screen while not yet decoded (blank or half-loaded).
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const [w = 1440, h = 900, cpu = 4, net = 'fast4g'] = process.argv.slice(2);
const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu-rasterization'] });
const ctx = await b.newContext({ viewport: { width: +w, height: +h }, isMobile: +w < 768, hasTouch: +w < 768 });
const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
if (net === 'fast4g') await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 60, downloadThroughput: 9e6 / 8, uploadThroughput: 1.5e6 / 8 });
await cdp.send('Emulation.setCPUThrottlingRate', { rate: +cpu });
await p.addInitScript(() => {
  window.__f = []; window.__y = []; window.__lt = []; window.__blank = new Map();
  new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: 'longtask', buffered: true });
  const tick = t => {
    window.__f.push(t); window.__y.push(scrollY);
    if (window.__f.length % 6 === 0) document.querySelectorAll('img').forEach(i => {
      const r = i.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 20 && getComputedStyle(i).visibility !== 'hidden' && +getComputedStyle(i).opacity > .05 && !(i.complete && i.naturalWidth)) {
        const k = i.currentSrc.split('/').pop() || i.getAttribute('src'); window.__blank.set(k, (window.__blank.get(k) || 0) + 1);
      }
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
});
if (process.env.CSS) await p.addInitScript(css => addEventListener('DOMContentLoaded', () => document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`)), process.env.CSS);
await p.goto(process.env.URL || 'http://127.0.0.1:8731/', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(+(process.env.WAIT || 2500));
await p.evaluate(() => { window.__f = []; window.__y = []; window.__lt = []; window.__t0 = performance.now(); });
await p.mouse.move(+w * .6, +h * .5);
const t0 = Date.now();
for (let i = 0; i < 3000; i++) {
  if (+w < 768) await p.mouse.wheel(0, 40); else await p.mouse.wheel(0, 30);
  await p.waitForTimeout(16);
  if (i % 40 === 0 && await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4)) break;
}
const r = await p.evaluate(() => {
  const d = []; for (let i = 1; i < __f.length; i++) d.push(__f[i] - __f[i - 1]);
  d.sort((a, b) => a - b);
  const q = k => Math.round(d[Math.floor(d.length * k)]);
  return { frames: d.length, p50: q(.5), p95: q(.95), p99: q(.99), over50: d.filter(x => x > 50).length, over100: d.filter(x => x > 100).length,
    longtasks: __lt.length, longest: Math.max(0, ...__lt.map(x => x[1])), blank: [...__blank.entries()],
    slow: (() => { const o = []; for (let i = 1; i < __f.length; i++) { const g = __f[i] - __f[i - 1]; if (g > 40) {
      const y = __y[i], at = [...document.querySelectorAll('main > section, footer')].find(s => { const t = s.getBoundingClientRect().top + scrollY; return y + innerHeight / 2 >= t && y + innerHeight / 2 < t + s.offsetHeight; });
      o.push(Math.round(g) + 'ms t=' + Math.round(__f[i] - __t0) + ' y=' + Math.round(y) + ' ' + (at ? (at.id || at.className.split(' ')[0]) : '?')); } } return o; })() };
});
console.log(`${w}px cpu${cpu} ${net}:`, JSON.stringify(r), `${Math.round((Date.now() - t0) / 1000)}s`);
await b.close();
