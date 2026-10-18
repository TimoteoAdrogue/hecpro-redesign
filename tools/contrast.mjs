// usage: node tools/contrast.mjs  ->  WCAG ratio of every visible text node against its real background, light + dark
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const url = process.env.URL || 'http://127.0.0.1:8731/';
const b = await chromium.launch({ channel: 'chrome' });
for (const scheme of ['light', 'dark']) {
  const p = await (await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: scheme, reducedMotion: 'reduce' })).newPage();
  await p.goto(url, { waitUntil: 'load' }); await p.waitForTimeout(1500);
  const res = await p.evaluate(() => {
    const parse = c => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m[3] ?? 1 }; };
    const over = (top, base) => ({ r: top.r * top.a + base.r * (1 - top.a), g: top.g * top.a + base.g * (1 - top.a), b: top.b * top.a + base.b * (1 - top.a), a: 1 });
    const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
    const bgOf = el => { // stack every background from the root down to the element
      const chain = []; for (let e = el; e; e = e.parentElement) chain.unshift(e);
      let c = { r: 255, g: 255, b: 255, a: 1 };
      for (const e of chain) {
        const s = getComputedStyle(e); const bg = parse(s.backgroundColor); if (bg.a > 0) c = over(bg, c);
        if (e.classList.contains('hl') || (e.tagName === 'SPAN' && e.parentElement?.tagName === 'LABEL' && e.previousElementSibling?.checked)) {
          const hl = parse(getComputedStyle(e, '::before').backgroundColor); if (hl.a > 0) c = over(hl, c);
        }
      }
      return c;
    };
    const out = [], seen = new Set();
    document.head.insertAdjacentHTML('beforeend', '<style>*,*::before,*::after{transition:none!important}</style>'); // read final colours, not mid-transition ones
    const zones = [...document.querySelectorAll('main [data-field], footer')];
    const nodes = [];
    for (const z of zones) {
      if (z.dataset.field) document.documentElement.dataset.field = z.dataset.field;
      const w = document.createTreeWalker(z, NodeFilter.SHOW_TEXT);
      for (let n; (n = w.nextNode());) nodes.push([n, z.dataset.field || 'footer', getComputedStyle(n.parentElement || z).color, bgOf(n.parentElement || z)]);
    }
    for (const [n, field, color, bgc] of nodes) {
      const el = n.parentElement; if (!n.data.trim() || !el || el.closest('[aria-hidden="true"], dialog:not([open]), script, style, .sr-only')) continue;
      const s = getComputedStyle(el); if (s.visibility === 'hidden' || +s.opacity === 0 || el.getClientRects().length === 0) continue;
      const bg = bgc, fg = over(parse(color), bg), size = parseFloat(s.fontSize), bold = +s.fontWeight >= 700;
      const r = ratio(fg, bg), need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      const key = color + '|' + JSON.stringify(bg) + '|' + need;
      if (seen.has(key)) continue; seen.add(key);
      out.push({ r: +r.toFixed(2), need, size: Math.round(size), text: n.data.trim().slice(0, 34), cls: field + ' .' + el.className.toString().slice(0, 24), color });
    }
    return out.sort((a, b) => a.r / a.need - b.r / b.need);
  });
  const fail = res.filter(x => x.r < x.need);
  console.log(`== ${scheme}: ${res.length} distinct colour pairs, ${fail.length} below threshold`);
  (fail.length ? fail : res.slice(0, 5)).forEach(x => console.log(`  ${x.r}:1 (need ${x.need}) ${x.size}px .${x.cls} "${x.text}" ${x.color}`));
}
await b.close();
