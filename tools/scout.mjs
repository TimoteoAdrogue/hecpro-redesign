import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const url = process.argv[2] || 'https://www.hecpro.ch/';
const tag = process.argv[3] || 'home';
const b = await chromium.launch({ channel: 'chrome' });
for (const [name, vp, mobile] of [['desk', {width:1440,height:900}, false], ['mob', {width:390,height:844}, true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, deviceScaleFactor: 1, locale: 'fr-CH' });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load', timeout: 60000 });
  await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); });
  await p.waitForTimeout(3000);
  await p.screenshot({ path: `${tag}-${name}.png`, fullPage: true });
  if (name === 'desk') {
    const info = await p.evaluate(() => {
      const fonts = new Set(), colors = new Set(), bgs = new Set();
      document.querySelectorAll('h1,h2,h3,p,a,button,span,li').forEach(e => { const s = getComputedStyle(e); fonts.add(s.fontFamily.split(',')[0] + ' ' + s.fontWeight); colors.add(s.color); bgs.add(s.backgroundColor); });
      return {
        text: document.body.innerText,
        h: document.body.scrollHeight,
        links: [...document.querySelectorAll('a')].map(a => a.innerText.trim().slice(0,60) + ' -> ' + a.href).filter((v,i,s)=>s.indexOf(v)===i),
        imgs: [...document.querySelectorAll('img')].map(i => i.currentSrc + ' ' + i.naturalWidth + 'x' + i.naturalHeight + ' alt=' + i.alt),
        fonts: [...fonts], colors: [...colors], bgs: [...bgs].filter(c => c !== 'rgba(0, 0, 0, 0)'),
        headings: [...document.querySelectorAll('h1,h2,h3')].map(h => h.tagName + ': ' + h.innerText.trim().slice(0,100)),
      };
    });
    const fs = await import('fs');
    fs.writeFileSync(`${tag}-info.json`, JSON.stringify(info, null, 2));
  }
  await ctx.close();
}
await b.close();
