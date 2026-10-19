// usage: URL=<url> node tools/system.mjs  ->  functional checks of navigation, controls, dialogs, keyboard, deep links
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
const U = process.env.URL || 'http://127.0.0.1:8731/';
const b = await chromium.launch({ channel: 'chrome' });
const res = []; const ok = (name, pass, info = '') => res.push(`${pass ? 'PASS' : 'FAIL'}  ${name}${info ? '  (' + info + ')' : ''}`);
const page = async (w, h, opts = {}) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768, ...opts });
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => m.type() === 'error' && p.errs.push(m.text()));
  return p;
};
const ready = p => p.waitForFunction(() => window.ScrollTrigger && ScrollTrigger.getAll().length > 4, null, { timeout: 15000 }).then(() => p.waitForTimeout(600));
const topOf = (p, sel) => p.evaluate(s => Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
const settle = p => p.waitForTimeout(2200);

// ---- desktop
let p = await page(1440, 900);
await p.goto(U, { waitUntil: 'load' }); await ready(p);
const H = await p.evaluate(() => document.documentElement.scrollHeight), packsY = await p.evaluate(() => document.querySelector('#packs').getBoundingClientRect().top + scrollY);
ok('page length', true, `${Math.round(H / 900)} screens, packs at screen ${(packsY / 900).toFixed(1)}`);
for (const id of ['apercu', 'matieres', 'packs', 'coaching', 'avis', 'faq']) {
  await p.click(`.top__nav a[href="#${id}"]`); await settle(p);
  if (!(await p.evaluate(i => location.hash === '#' + i, id))) ok(`URL hash follows #${id}`, false);
  const t = await topOf(p, `#${id}`), vis = await p.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return r.top < innerHeight * .5 && r.bottom > 100; }, `#${id}`);
  ok(`nav → #${id}`, vis && t > -40 && t < 140, `top=${t}`);
}
await p.evaluate(() => scrollTo(0, 0)); await settle(p);
await p.click('.hero a[href="#packs"]'); await settle(p); ok('hero CTA → packs', Math.abs(await topOf(p, '#packs')) < 140, `top=${await topOf(p, '#packs')}`);
await p.click('label:has(input[value="decouverte"])'); await p.waitForTimeout(700);
const ch = await p.evaluate(() => ({ d: getComputedStyle(document.querySelector('.pack--decouverte')).boxShadow, e: getComputedStyle(document.querySelector('.pack--elite')).boxShadow, note: [...document.querySelectorAll('.chooser__note')].filter(n => n.offsetParent).map(n => n.dataset.for) }));
ok('chooser picks Découverte', ch.d !== 'none' && ch.e === 'none' && ch.note.join() === 'decouverte', JSON.stringify(ch.note));
await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
ok('chooser keyboard arrow', await p.evaluate(() => document.querySelector('input[value="elite"]').checked));
const hrefs = await p.evaluate(() => [...document.querySelectorAll('a[href^="http"]')].map(a => a.href));
ok('buy links → Podia checkout', hrefs.includes('https://www.hecpro.ch/pack-elite/buy') && hrefs.includes('https://www.hecpro.ch/pack-decouverte/buy'));
ok('coaching → WhatsApp', hrefs.filter(h => h.includes('wa.link')).length >= 2);
// tour index
await p.click('.top__nav a[href="#apercu"]'); await settle(p); await p.evaluate(() => scrollBy(0, innerHeight * .9)); await settle(p);
for (const i of [3, 5, 0]) {
  await p.click(`.tour__index button[data-go="${i}"]`); await settle(p);
  const vis = await p.evaluate(() => [...document.querySelectorAll('.tour__steps li')].findIndex(li => +getComputedStyle(li).opacity > .5));
  ok(`tour index → step ${i + 1}`, vis === i, `shown=${vis + 1}`);
}
// reader
await p.evaluate(() => document.querySelector('[data-open-reader]').scrollIntoView({ block: 'center' })); await settle(p);
await p.click('[data-open-reader]'); await p.waitForTimeout(800);
const rd = await p.evaluate(() => ({ open: document.querySelector('[data-reader]').open, imgs: [...document.querySelectorAll('.reader img')].filter(i => i.complete && i.naturalWidth).length }));
await p.mouse.wheel(0, 1500); await p.waitForTimeout(600);
const rscroll = await p.evaluate(() => document.querySelector('[data-reader]').scrollTop);
await p.keyboard.press('Escape'); await p.waitForTimeout(500);
ok('reader opens, 8 pages loaded, scrolls, Esc closes', rd.open && rd.imgs === 8 && rscroll > 200 && !(await p.evaluate(() => document.querySelector('[data-reader]').open)), `imgs=${rd.imgs} scrollTop=${rscroll}`);
// faq
await p.click('.top__nav a[href="#faq"]'); await settle(p);
await p.click('.faq details:nth-child(3) summary'); await p.waitForTimeout(600);
ok('FAQ item opens', await p.evaluate(() => document.querySelector('.faq details:nth-child(3)').open));
// keyboard
await p.goto(U, { waitUntil: 'load' }); await ready(p);
await p.keyboard.press('Tab');
const f1 = await p.evaluate(() => ({ cls: document.activeElement.className, top: Math.round(document.activeElement.getBoundingClientRect().top) }));
ok('Tab 1 = skip link, visible', f1.cls.includes('skip') && f1.top >= 0, JSON.stringify(f1));
await p.keyboard.press('Enter'); await p.waitForTimeout(800);
ok('skip link moves focus to main', await p.evaluate(() => document.activeElement.id === 'contenu' && location.hash === '#contenu'));
let seen = [];
for (let i = 0; i < 14; i++) { await p.keyboard.press('Tab'); seen.push(await p.evaluate(() => { const e = document.activeElement, s = getComputedStyle(e); return (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 18) + (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0 ? '' : ' [NO RING]'); })); }
ok('focus rings on tab stops', !seen.some(s => s.includes('[NO RING]')), seen.join(' | '));
ok('desktop console clean', p.errs.length === 0, p.errs.slice(0, 2).join(' / '));

// ---- deep links (shared URL with a hash)
for (const id of ['packs', 'faq', 'coaching']) {
  const q = await page(1440, 900); await q.goto(U + '#' + id, { waitUntil: 'load' }); await ready(q); await q.waitForTimeout(1500);
  const t = await topOf(q, '#' + id); ok(`deep link /#${id} lands on it`, t > -40 && t < 160, `top=${t}`); await q.context().close();
}

// ---- phone
p = await page(390, 844);
await p.goto(U, { waitUntil: 'load' }); await ready(p);
await p.tap('[data-open-menu]'); await p.waitForTimeout(500);
ok('menu opens', await p.evaluate(() => document.querySelector('[data-menu]').open));
await p.tap('.menu__nav a[href="#packs"]'); await settle(p);
const mp = await p.evaluate(() => ({ open: document.querySelector('[data-menu]').open, top: Math.round(document.querySelector('#packs').getBoundingClientRect().top) }));
ok('menu link closes and lands on packs', !mp.open && mp.top > -40 && mp.top < 160, JSON.stringify(mp));
await p.evaluate(() => scrollTo(0, innerHeight * 1.5)); await settle(p);
ok('dock visible after hero', await p.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-on')));
await p.evaluate(() => document.querySelector('#packs').scrollIntoView()); await settle(p);
ok('dock hidden on packs', !(await p.evaluate(() => document.querySelector('[data-dock]').classList.contains('is-on'))));
const tgt = await p.evaluate(() => [...document.querySelectorAll('a, button, summary, label')].filter(e => e.offsetParent && getComputedStyle(e).visibility !== 'hidden').map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.height), (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 16)]; }).filter(([h]) => h > 0 && h < 40));
ok('phone tap targets ≥ 40px', tgt.length === 0, tgt.slice(0, 6).map(t => t.join(':')).join(' | '));
ok('phone console clean', p.errs.length === 0, p.errs.slice(0, 2).join(' / '));

// ---- reduced motion + no JS
p = await page(1440, 900, { reducedMotion: 'reduce' }); await p.goto(U, { waitUntil: 'load' }); await p.waitForTimeout(2000);
const rm = await p.evaluate(() => ({ n: document.querySelector('[data-stat-n]').textContent, pins: ScrollTrigger.getAll().filter(s => s.pin).length, hid: [...document.querySelectorAll('h1,h2,.lede,.sub,.pack,.subj,.sticker')].filter(e => +getComputedStyle(e).opacity < .5).length }));
ok('reduced motion: 68 shown, no pins, nothing hidden', rm.n === '68' && rm.pins === 0 && rm.hid === 0, JSON.stringify(rm));
p = await page(1440, 900, { javaScriptEnabled: false }); await p.goto(U, { waitUntil: 'load' }); await p.waitForTimeout(800);
const nj = await p.evaluate(() => ({ hid: [...document.querySelectorAll('h1,h2,.lede,.sub,.pack,.subj,.sticker,.tour__pg[data-pg="1"]')].filter(e => +getComputedStyle(e).opacity < .5 || getComputedStyle(e).display === 'none').length, sw: document.documentElement.scrollWidth }));
ok('no JS: content visible, no overflow', nj.hid === 0 && nj.sw <= 1440, JSON.stringify(nj));
console.log(res.join('\n'));
await b.close();
