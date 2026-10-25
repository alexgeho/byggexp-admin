import re, html, base64, sys
md = open(sys.argv[1]).read()
img = base64.b64encode(open(sys.argv[2], 'rb').read()).decode()

def inline(s):
    s = html.escape(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'`(.+?)`', r'<code>\1</code>', s)
    return s

out = []
intable = False
for line in md.split('\n'):
    if line.startswith('|'):
        cells = [c.strip() for c in line.strip().strip('|').split('|')]
        if all(set(c) <= set('-: ') for c in cells):
            continue
        tag = 'th' if not intable else 'td'
        if not intable:
            out.append('<table>')
            intable = True
        out.append('<tr>' + ''.join(f'<{tag}>{inline(c)}</{tag}>' for c in cells) + '</tr>')
        continue
    if intable:
        out.append('</table>')
        intable = False
    m = re.match(r'^(#{1,3}) (.*)', line)
    if m:
        n = len(m.group(1))
        if n == 2 and m.group(2).startswith('1.'):
            out.append(f'<img src="data:image/png;base64,{img}">')
        out.append(f'<h{n}>{inline(m.group(2))}</h{n}>')
        continue
    m = re.match(r'^\s*(-|\d+\.) (.*)', line)
    if m:
        mark = '•' if m.group(1) == '-' else m.group(1)
        indent = 28 if line.startswith('  ') else 14
        out.append(f'<p class="li" style="margin-left:{indent}px">{mark} {inline(m.group(2))}</p>')
        continue
    if line.startswith('>'):
        out.append(f'<blockquote>{inline(line.lstrip("> "))}</blockquote>')
        continue
    if line.strip():
        out.append(f'<p>{inline(line)}</p>')

css = '''body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;color:#0A1828;margin:40px 56px;font-size:13px;line-height:1.5}
h1{font-size:28px;font-weight:600;letter-spacing:-.02em}h2{font-size:19px;margin-top:28px;border-top:1px solid #E1EAF3;padding-top:16px}h3{font-size:15px}
code{background:#F1F6FB;padding:1px 5px;border-radius:4px;font-size:12px}table{border-collapse:collapse;margin:8px 0}td,th{border-bottom:1px solid #E1EAF3;padding:5px 12px;text-align:left}
blockquote{background:#F1F6FB;border-radius:12px;padding:12px 16px;margin:8px 0;font-size:12px}img{width:100%;border:1px solid #E1EAF3;border-radius:16px;margin:12px 0}p.li{margin-top:3px;margin-bottom:3px}'''
open(sys.argv[3], 'w').write(f'<!doctype html><meta charset="utf-8"><style>{css}</style><body>' + '\n'.join(out) + '</body>')
