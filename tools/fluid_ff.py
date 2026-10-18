"""Fluidity + image readiness in a real, visible Firefox (separate profile, GPU), wheel-scrolling like a person.
usage: python3 tools/fluid_ff.py [url] [width] [height]"""
import json, sys, time
sys.path.insert(0, __import__('os').path.dirname(__file__))
from ff import Firefox

url = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8731/'
w, h = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1440, 900)
PROBE = r'''
window.__f = []; window.__y = []; window.__blank = {}; window.__lt = [];
const tick = t => {
  __f.push(t); __y.push(scrollY);
  if (__f.length % 6 === 0) document.querySelectorAll('img').forEach(i => {
    const r = i.getBoundingClientRect(), s = getComputedStyle(i);
    if (r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && r.width > 20 && s.visibility !== 'hidden' && +s.opacity > .05 && !(i.complete && i.naturalWidth)) {
      const k = (i.currentSrc || i.src).split('/').pop(); __blank[k] = (__blank[k] || 0) + 1;
    }
  });
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
'''
with Firefox(w, h + 85, headless=False) as ff:   # + browser chrome so the page viewport is about w x h
    ff.go(url)
    time.sleep(3)
    ff.js(PROBE)
    t0 = time.time()
    for batch in range(80):
        ff.cmd("WebDriver:PerformActions", {"actions": [{"type": "wheel", "id": "wheel", "actions":
            [{"type": "scroll", "x": int(w * .6), "y": int(h * .5), "deltaX": 0, "deltaY": 30, "duration": 16} for _ in range(40)]}]})
        if ff.js("return scrollY + innerHeight >= document.documentElement.scrollHeight - 4"):
            break
    time.sleep(1)
    r = ff.js('''const d = []; for (let i = 1; i < __f.length; i++) d.push(__f[i] - __f[i - 1]); d.sort((a, b) => a - b);
      const q = k => Math.round(d[Math.floor(d.length * k)]);
      return { frames: d.length, p50: q(.5), p90: q(.9), p99: q(.99), over34: d.filter(x => x > 34).length, over50: d.filter(x => x > 50).length,
               over100: d.filter(x => x > 100).length, worst: Math.round(d.at(-1)), blank: __blank, vw: innerWidth, vh: innerHeight,
               slow: (() => { const out = []; for (let i = 1; i < __f.length; i++) { const g = __f[i] - __f[i - 1]; if (g > 34) {
                 const y = __y[i]; const at = [...document.querySelectorAll('main > section, footer')].find(s => { const top = s.getBoundingClientRect().top + scrollY; return y + innerHeight / 2 >= top && y + innerHeight / 2 < top + s.offsetHeight; });
                 out.push(Math.round(g) + 'ms@' + Math.round(y) + ':' + (at ? (at.id || at.className.split(' ')[0]) : '?')); } } return out; })() };''')
    print(f"firefox {w}px:", json.dumps(r), f"{round(time.time() - t0)}s")
