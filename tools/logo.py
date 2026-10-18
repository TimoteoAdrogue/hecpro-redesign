"""Logo lab: builds the three HECPro logo directions as self-contained SVG.
Wordmark glyphs are outlined from CMU Serif Bold (assets/fonts/cmunbx.woff, SIL OFL),
so the files never depend on a font being installed. Run: python3 tools/logo.py"""
import math, os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen

OUT = 'lab/logo'
INK, TEAL, TEAL_INK, PAPER, DARK, LIGHT = '#1B2858', '#0ABAB5', '#07726F', '#F6F7F3', '#0B1128', '#E8EBF6'
font = TTFont('assets/fonts/cmunbx.woff'); UPM = font['head'].unitsPerEm
cmap, gs, hmtx = font.getBestCmap(), font.getGlyphSet(), font['hmtx']

def glyph(ch):
    g = cmap[ord(ch)]; pen = SVGPathPen(gs); gs[g].draw(pen); b = BoundsPen(gs); gs[g].draw(b)
    return pen.getCommands(), hmtx[g][0], b.bounds

CAP = glyph('H')[2][3]  # cap height in font units

def word(text, size, x0=0.0, base=0.0, kern=None, track=0.0):
    """Outlined text: returns (list of (char, svg <path>, x-start, x-end)), total width. size = cap height."""
    s = size / CAP; x = x0; out = []
    for i, ch in enumerate(text):
        d, adv, (xmin, _, xmax, _) = glyph(ch)
        out.append((ch, f'<path transform="translate({x:.2f} {base:.2f}) scale({s:.5f} {-s:.5f})" d="{d}"/>', x + xmin * s, x + xmax * s))
        k = (kern or {}).get(text[i:i + 2], 0.0)
        x += (adv + (k + track) * UPM) * s
    return out, out[-1][3] - x0

def rounded(pts, r):
    d = ''
    for i, c in enumerate(pts):
        a, b = pts[i - 1], pts[(i + 1) % len(pts)]
        def mv(p, q, t):
            l = math.dist(p, q); return (p[0] + (q[0] - p[0]) * t / l, p[1] + (q[1] - p[1]) * t / l)
        p1, p2 = mv(c, a, r), mv(c, b, r)
        d += ('M' if i == 0 else 'L') + f'{p1[0]:.2f} {p1[1]:.2f}Q{c[0]} {c[1]} {p2[0]:.2f} {p2[1]:.2f}'
    return d + 'Z'

def svg(w, h, body, defs=''):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.2f} {h:.2f}">' + (f'<defs>{defs}</defs>' if defs else '') + body + '</svg>\n'

# ---------- Direction 1: refined mortarboard (the client's idea, redrawn) ----------
def d1_mark(main, accent, uid='a'):
    board = rounded([(12, 2.2), (23, 8.0), (12, 13.8), (1, 8.0)], 1.2)
    body = 'M7.0 11.2V15.9C9.6 18.6 14.4 18.6 17.0 15.9V11.2Z'
    # cord from the button to the left corner, then the ribbon hangs and ends in a V notch
    cord = 'M12 8.0L3.4 8.9'
    tail = 'M2.15 8.6H4.65V18.6L3.4 17.3L2.15 18.6Z'
    btn = 'M10.6 8.0a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0Z'
    defs = (f'<mask id="k{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/>'
            f'<path d="{cord}" stroke="#000" stroke-width="3.1" stroke-linecap="round"/><path d="{btn}" fill="#000" stroke="#000" stroke-width="1.8"/></mask>'
            f'<mask id="b{uid}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24"><rect width="24" height="24" fill="#fff"/>'
            f'<path d="{board}" fill="#000" stroke="#000" stroke-width="2.2" stroke-linejoin="round"/></mask>')
    return defs, (f'<g mask="url(#k{uid})"><path d="{board}" fill="{main}"/></g><g mask="url(#b{uid})"><path d="{body}" fill="{main}"/></g>'
                  f'<path d="{cord}" stroke="{accent}" stroke-width="1.3" stroke-linecap="round"/><path d="{btn}{tail}" fill="{accent}"/>')

# ---------- Direction 2: wordmark with the site's highlighter ----------
KERN = {'HE': -.012, 'EC': -.004, 'CP': -.018, 'Pr': -.035, 'ro': -.012}
def swipe(x1, x2, top, bot, seed=1):
    j = [(.4, -.3), (-.2, .5), (.5, .2), (-.4, -.2)]
    return (f'M{x1+j[0][0]:.2f} {top+j[0][1]:.2f}C{(x1+x2)/2:.2f} {top-.9:.2f} {(x1+x2)/2:.2f} {top+.6:.2f} {x2+j[1][0]:.2f} {top+j[1][1]:.2f}'
            f'L{x2+j[2][0]+.6:.2f} {bot+j[2][1]:.2f}C{(x1+x2)/2:.2f} {bot+.8:.2f} {(x1+x2)/2:.2f} {bot-.5:.2f} {x1+j[3][0]-.4:.2f} {bot+j[3][1]:.2f}Z')

def d2_lockup(ink, hl, pro, knock=False):
    cap = 20.0; glyphs, w = word('HECPro', cap, 2, cap + 2, KERN)
    pro_x1, pro_x2 = glyphs[3][2], glyphs[5][3]
    band = swipe(pro_x1 - 1.6, pro_x2 + 1.8, cap + 2 - cap * .58, cap + 2 + 3.2)
    H, Wt = cap + 2 + 6.5, w + 6.5
    hec = ''.join(g[1] for g in glyphs[:3]); prop = ''.join(g[1] for g in glyphs[3:])
    if knock:  # one colour: the swipe drops below the baseline as a marker underline
        under = swipe(pro_x1 - 1.6, pro_x2 + 1.8, cap + 2 + 2.2, cap + 2 + 5.2)
        return svg(Wt, H + 1, f'<path d="{under}" fill="{ink}"/><g fill="{ink}">{hec}{prop}</g>')
    return svg(Wt, H, f'<path d="{band}" fill="{hl}" transform="rotate(-1 {pro_x1} {cap})"/><g fill="{ink}">{hec}</g><g fill="{pro}">{prop}</g>')

def d2_mark(main, accent, uid='a'):
    glyphs, w = word('H', 13.2, 0, 0)
    x = 12 - (glyphs[0][2] + glyphs[0][3]) / 2
    glyphs, _ = word('H', 13.2, x, 17.4)
    band = swipe(1.6, 21.8, 12.6, 19.4)
    return '', f'<path d="{band}" fill="{accent}" transform="rotate(-3 12 16)"/><g fill="{main}">{glyphs[0][1]}</g>'

# ---------- Direction 3: monogram, an H whose crossbar is a tick ----------
def rng(a):
    a &= 0xFFFFFFFF
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF; t = a
        t = ((t ^ (t >> 15)) * (1 | t)) & 0xFFFFFFFF
        t = (t + (((t ^ (t >> 7)) * (61 | t)) & 0xFFFFFFFF) ^ t) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return f

def rough_rect(x, y, w, h, seed=7, k=None):
    r = rng(seed); j = lambda a: (r() - .5) * 2 * a
    k = k if k is not None else min(9, max(2.5, min(w, h) * .045))
    p = [(x + j(k), y + j(k)), (x + w + j(k), y + j(k)), (x + w + j(k), y + h + j(k)), (x + j(k), y + h + j(k)),
         (x + j(k * .6), y + j(k * .6)), (x + min(w * .12, 60), y - k * .5 + j(k * .4))]
    d = f'M{p[0][0]:.2f},{p[0][1]:.2f}'
    for a, b in zip(p, p[1:]):
        d += f'Q{(a[0]+b[0])/2 + j(k):.2f},{(a[1]+b[1])/2 + j(k):.2f} {b[0]:.2f},{b[1]:.2f}'
    return d

def d3_mark(main, accent, uid='a'):
    g, _ = word('P', 12.4, 0, 0); x = 12.3 - (g[0][2] + g[0][3]) / 2
    g, _ = word('P', 12.4, x, 18.2)
    frame = rough_rect(3.2, 3.4, 17.6, 17.4, seed=31, k=.75)
    return '', (f'<path d="{frame}" fill="none" stroke="{accent}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<g fill="{main}">{g[0][1]}</g>')

def d3_lockup(ink, pen, pro, mono=False):
    cap = 20.0; glyphs, w = word('HECPro', cap, 2, cap + 9, KERN | {'CP': .06})
    x1, x2 = glyphs[3][2] - 4.2, glyphs[5][3] + 4.6
    frame = rough_rect(x1, 3.4, x2 - x1, cap + 10.4, seed=12, k=1.6)
    hec = ''.join(g[1] for g in glyphs[:3]); prop = ''.join(g[1] for g in glyphs[3:])
    return svg(x2 + 5, cap + 18, f'<path d="{frame}" fill="none" stroke="{pen}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'
               f'<g fill="{ink}">{hec}</g><g fill="{pro}">{prop}</g>')

MARKS = {'d1': d1_mark, 'd2': d2_mark, 'd3': d3_mark}

def mark_svg(d, main, accent, uid='a'):
    defs, body = MARKS[d](main, accent, uid); return svg(24, 24, body, defs)

def tile_svg(d, bg=TEAL, fg='#fff', circle=False, uid='t'):
    if d in ('d2', 'd3'): bg = PAPER
    defs, body = MARKS[d](fg, fg, uid) if d == 'd1' else MARKS[d](INK, TEAL if d == 'd2' else '#2443B0', uid)
    shape = '<circle cx="12" cy="12" r="12"' if circle else '<rect width="24" height="24" rx="5"'
    return svg(24, 24, f'{shape} fill="{bg}"/><g transform="translate(3.6 3.6) scale(.7)">{body}</g>', defs)

def lockup_svg(d, ink, accent, pro, uid='l'):
    if d == 'd2': return d2_lockup(ink, '#0ABAB55c' if accent == TEAL else accent, pro)
    if d == 'd3': return d3_lockup(ink, '#2443B0' if ink == INK else ('#8EA6FF' if ink == LIGHT else ink), pro)
    cap = 20.0; m = 30.0
    defs, body = MARKS[d](ink, accent, uid)
    glyphs, w = word('HECPro', cap, m + 9, cap + 6, KERN)
    hec = ''.join(g[1] for g in glyphs[:3]); prop = ''.join(g[1] for g in glyphs[3:])
    return svg(m + 9 + w + 3, cap + 12, f'<g transform="translate(0 {(cap + 12 - m) / 2:.2f}) scale({m / 24:.4f})">{body}</g><g fill="{ink}">{hec}</g><g fill="{pro}">{prop}</g>', defs)

def mono_lockup_svg(d, c, uid='o'):
    if d == 'd2': return d2_lockup(c, c, c, knock=True)
    if d == 'd3': return d3_lockup(c, c, c)
    return lockup_svg(d, c, c, c, uid)

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for d in MARKS:
        files = {
            f'{d}-mark.svg': mark_svg(d, INK, '#2443B0' if d == 'd3' else TEAL),
            f'{d}-mark-dark.svg': mark_svg(d, LIGHT, '#8EA6FF' if d == 'd3' else TEAL),
            f'{d}-mono.svg': mark_svg(d, INK, INK),
            f'{d}-tile.svg': tile_svg(d),
            f'{d}-avatar.svg': tile_svg(d, circle=True),
            f'{d}-lockup.svg': lockup_svg(d, INK, TEAL, TEAL_INK),
            f'{d}-lockup-dark.svg': lockup_svg(d, LIGHT, TEAL, '#3ED2CC'),
            f'{d}-lockup-mono.svg': mono_lockup_svg(d, INK),
            f'{d}-lockup-white.svg': mono_lockup_svg(d, '#FFFFFF'),
        }
        for name, s in files.items(): open(f'{OUT}/{name}', 'w').write(s)
    print('wrote', len(os.listdir(OUT)), 'files to', OUT)


# ---------- apply: the chosen direction becomes the single source of truth ----------
def apply(d):
    """Writes assets/logo/*.svg, favicon.svg and the page sprite symbols, all from the functions above."""
    os.makedirs('assets/logo', exist_ok=True)
    files = {
        'mark.svg': mark_svg(d, INK, TEAL), 'mark-dark.svg': mark_svg(d, LIGHT, TEAL), 'mono.svg': mark_svg(d, INK, INK),
        'lockup.svg': lockup_svg(d, INK, TEAL, TEAL_INK), 'lockup-dark.svg': lockup_svg(d, LIGHT, TEAL, '#3ED2CC'),
        'lockup-mono.svg': mono_lockup_svg(d, INK), 'lockup-white.svg': mono_lockup_svg(d, '#FFFFFF'),
        'tile.svg': tile_svg(d), 'avatar.svg': tile_svg(d, circle=True),
    }
    for name, s in files.items(): open(f'assets/logo/{name}', 'w').write(s)
    open('favicon.svg', 'w').write(files['tile.svg'])
    # Page sprite: same geometry, colours from the page (ink = currentColor, accents = CSS tokens)
    mdefs, mbody = MARKS[d]('currentColor', 'var(--logo-accent, var(--teal))', 'sp')
    cap, m = 20.0, 30.0
    glyphs, w = word('HECPro', cap, m + 9, cap + 6, KERN)
    hec = ''.join(g[1] for g in glyphs[:3]); prop = ''.join(g[1] for g in glyphs[3:])
    lw, lh = m + 9 + w + 3, cap + 12
    sprite = (f'<defs>{mdefs}</defs>'
              f'<symbol id="i-mark" viewBox="0 0 24 24">{mbody}</symbol>'
              f'<symbol id="i-lockup" viewBox="0 0 {lw:.2f} {lh:.2f}"><g transform="translate(0 {(lh - m) / 2:.2f}) scale({m / 24:.4f})">{mbody}</g>'
              f'<g fill="currentColor">{hec}</g><g fill="var(--logo-pro, var(--teal-ink))">{prop}</g></symbol>')
    h = open('index.html').read()
    a, b = h.index('<!-- logo:start'), h.index('<!-- logo:end -->')  # start marker carries a note after the first run
    open('index.html', 'w').write(h[:a] + '<!-- logo:start (generated by tools/logo.py, edit there) -->' + sprite + h[b:])
    print(f'applied {d}: assets/logo/ ({len(files)} files), favicon.svg, sprite; lockup ratio {lw / lh:.4f}')

if __name__ == '__main__' and len(__import__('sys').argv) > 2 and __import__('sys').argv[1] == 'apply':
    apply(__import__('sys').argv[2])
