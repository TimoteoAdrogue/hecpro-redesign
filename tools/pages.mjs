import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'fs';
const urls = { elite:'https://www.hecpro.ch/pack-elite', privacy:'https://www.hecpro.ch/privacy' };
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport:{width:1440,height:900}, locale:'fr-CH' });
const out = {};
for (const [k,u] of Object.entries(urls)) {
  const p = await ctx.newPage();
  try { await p.goto(u, { waitUntil:'load', timeout:60000 }); } catch(e) { out[k]={err:String(e)}; continue; }
  await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=700){scrollTo(0,y);await new Promise(r=>setTimeout(r,100));} scrollTo(0,0); });
  await p.waitForTimeout(2500);
  if (k !== 'home') await p.screenshot({ path:`${k}-desk.png`, fullPage:true });
  out[k] = await p.evaluate(() => ({
    url: location.href, title: document.title,
    text: (document.querySelector('main')||document.body).textContent.replace(/[ \t]+/g,' ').replace(/\n\s*\n+/g,'\n').trim(),
    links: [...new Set([...document.querySelectorAll('a')].map(a=>a.innerText.trim().slice(0,50)+' -> '+a.href))],
    imgs: [...document.querySelectorAll('img')].map(i=>i.currentSrc+' '+i.naturalWidth+'x'+i.naturalHeight),
    videos: [...document.querySelectorAll('video,iframe,source')].map(v=>v.tagName+' '+(v.src||v.currentSrc||'')+' poster='+(v.poster||'')),
  }));
  await p.close();
}
fs.writeFileSync('pages2.json', JSON.stringify(out,null,2));
await b.close();
