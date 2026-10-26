# usage: python3 tools/glass.py  ->  glass/index.html: the « Verre » trial, the same page with the glass material on top
# (assets/glass.css). Rerun after every edit to index.html; the main page stays the reference and the fallback.
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
h = (root / 'index.html').read_text()
h = re.sub(r'\b(href|src)="(?!https?:|#|mailto:|tel:|data:|/|\.\./)', r'\1="../', h)  # page moves one folder down
link = '<link rel="stylesheet" href="../assets/site.css">'
assert h.count(link) == 1
h = h.replace(link, link + '\n<link rel="stylesheet" href="../assets/glass.css">')
(root / 'glass').mkdir(exist_ok=True)
(root / 'glass' / 'index.html').write_text(h)
print('glass/index.html', len(h))
