// usage: URL=<url> node tools/walk.mjs <out.mp4> [width] [height]
// Real wheel-scroll walkthrough, frames from Chrome's screencast (CDP), encoded with the system ffmpeg.
import { chromium } from '/Users/adroguetimoteo/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import { execFileSync } from 'child_process';
import fs from 'fs';
const [out, w = 1280, h = 800] = process.argv.slice(2);
const dir = '/tmp/hecpro-walk'; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: +w, height: +h } });
const p = await ctx.newPage(), cdp = await ctx.newCDPSession(p);
const frames = [];
cdp.on('Page.screencastFrame', async f => { frames.push([f.metadata.timestamp, f.data]); await cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {}); });
await p.goto(process.env.URL || 'http://127.0.0.1:8731/', { waitUntil: 'load' });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 80, maxWidth: +w, maxHeight: +h, everyNthFrame: 1 });
await p.waitForTimeout(2800);
await p.mouse.move(+w * .7, +h * .5);
for (let i = 0; i < 3000; i++) {
  await p.mouse.wheel(0, 30);
  await p.waitForTimeout(16);
  if (i % 40 === 0 && await p.evaluate(() => scrollY + innerHeight >= document.documentElement.scrollHeight - 4)) break;
}
await p.waitForTimeout(1500);
await cdp.send('Page.stopScreencast');
await b.close();
// constant 30 fps: repeat or drop frames by their timestamps
const t0 = frames[0][0], t1 = frames.at(-1)[0], n = Math.floor((t1 - t0) * 30);
let k = 0;
for (let i = 0; i < n; i++) {
  const t = t0 + i / 30;
  while (k + 1 < frames.length && frames[k + 1][0] <= t) k++;
  fs.writeFileSync(`${dir}/${String(i).padStart(5, '0')}.jpg`, Buffer.from(frames[k][1], 'base64'));
}
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-framerate', '30', '-i', `${dir}/%05d.jpg`, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', '-crf', '27', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]);
console.log('wrote', out, frames.length, 'raw frames,', n, 'output frames');
