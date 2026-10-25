"""Every visible string on the page must exist in the client's own site (ref/SOURCE-hecpro.txt).
usage: python3 tools/copy-audit.py [page.html]   ->  lists strings with no source (sentence by sentence)"""
import html, re, sys
from html.parser import HTMLParser

SRC = open('ref/SOURCE-hecpro.txt').read()
def norm(s):
    s = html.unescape(s).replace(' ', ' ').replace(' ', ' ').replace('’', "'").replace('‘', "'")
    s = re.sub(r'[«»“”"]', '', s)
    s = re.sub(r'\s+', ' ', s).strip().lower()
    s = re.sub(r'\b1(re|ère|er)\b', r'1\1', s)
    return s
FICHE = open('ref/SOURCE-fiche.txt').read() if __import__('os').path.exists('ref/SOURCE-fiche.txt') else ''
src = re.sub(r'\s+([,.:;?!])', r'\1', norm(SRC + '\n' + FICHE)).replace(' — ', ' ')

class P(HTMLParser):
    SKIP = {'script', 'style', 'svg', 'symbol', 'title', 'head', 'code'}
    def __init__(s): super().__init__(); s.stack = []; s.chunks = []; s.cur = []
    BLOCK = {'p', 'h1', 'h2', 'h3', 'li', 'dt', 'dd', 'figcaption', 'summary', 'a', 'button', 'span', 'legend', 'label', 'blockquote', 'div', 'b'}
    def handle_starttag(s, t, a):
        s.stack.append(t)
        if t in ('p', 'h1', 'h2', 'h3', 'li', 'dt', 'dd', 'figcaption', 'summary', 'legend', 'button'): s.flush()
    def handle_endtag(s, t):
        if s.stack and s.stack[-1] == t: s.stack.pop()
        if t in ('p', 'h1', 'h2', 'h3', 'li', 'dt', 'dd', 'figcaption', 'summary', 'legend', 'button', 'a'): s.flush()
    def handle_data(s, d):
        if not any(x in s.SKIP for x in s.stack): s.cur.append(d)
    def flush(s):
        t = re.sub(r'\s+', ' ', ''.join(s.cur)).strip()
        if t: s.chunks.append(t)
        s.cur = []

page = open(sys.argv[1] if len(sys.argv) > 1 else 'index.html').read()
body = page[page.index('<body'):]
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
p = P(); p.feed(body); p.flush()
missing, seen = [], set()
for chunk in p.chunks:
    for sent in re.split(r'(?<=[.!?:;])\s+', chunk):
        n = re.sub(r'\s+([,.:;?!])', r'\1', norm(sent)).rstrip('.:;')
        if len(n) < 3 or n in seen or re.fullmatch(r'[\d\s%chf+.,×→/–-]*', n): continue
        seen.add(n)
        if n not in src: missing.append(sent)
print(f'{len(seen)} strings checked, {len(missing)} without a source on hecpro.ch:')
for m in missing: print('  -', m)
