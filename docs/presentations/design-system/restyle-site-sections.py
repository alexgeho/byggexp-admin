import re,glob,sys,html
S=sys.argv[1]; DRY=len(sys.argv)>2
F="font-family:'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif"
CR='#94A8BC'; CARD='background:#FFFFFF;border:1px solid #E1EAF3;border-radius:32px;box-shadow:0 1px 0 rgba(15,34,54,.02)'
txt=lambda s: re.sub(r'<[^>]+>','',s).replace('&nbsp;',' ').strip()
def crumbhtml(c): return f'<p style="font-size:22px;line-height:1.4;color:{CR}">'+'&nbsp;›&nbsp;'.join(x.strip() for x in c.split('›'))+'</p>'
def head(eb,title,cr=None):
    return f'''<div style="display:flex;flex-direction:column;align-items:center;gap:14px">
<p style="font-size:22px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#2394FF">{eb}</p>
<h2 style="{F};font-size:52px;font-weight:500;letter-spacing:-0.02em;line-height:1.05;color:#0A1828;text-align:center">{title}</h2>
{crumbhtml(cr) if cr else ''}</div>'''
def sec(i,body,aside,gap=40):
    return f'''<section id="{i}" data-transition="fade" style="background:#F1F6FB;color:#0A1828;{F};padding:80px 120px;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:{gap}px">
{body}
<aside>{aside}</aside>
</section>
'''
aside_of=lambda t: re.search(r'<aside>(.*?)</aside>',t,re.S).group(1)
for d in sorted(glob.glob(S+'/decks/*/project/slides')):
    cov=open(d+'/cover.html').read(); h1=txt(re.search(r'<h1[^>]*>(.*?)</h1>',cov,re.S).group(1))
    # flow
    t=open(d+'/flode.html').read()
    blocks=re.findall(r'<img src="([^"]+)" alt="([^"]*)"[^>]*>\s*<div style="display:flex;gap:16px;align-items:center"><p[^>]*>(\d+)</p><p[^>]*>(.*?)</p></div>\s*<p style="font-size:24px;line-height:1.5;margin-top:-8px[^"]*">(.*?)</p>\s*<p style="font-size:24px;line-height:1.4;color:#5B7591">(.*?)</p>',t,re.S)
    n=len(blocks); W=(1680-24*(n-1))//n; IW=W-40; IH=min(380,int(IW*0.78))
    cards=''.join(f'''<div style="display:flex;flex-direction:column;gap:16px;width:{W}px;padding:20px;{CARD}">
<img src="{b}" alt="{a}" style="width:{IW}px;height:{IH}px;object-fit:contain">
<div style="display:flex;gap:14px;align-items:center;margin-top:8px"><p style="width:40px;height:40px;flex:none;border-radius:50%;background:rgba(69,179,107,.14);color:#45B36B;font-size:22px;font-weight:500;line-height:40px;text-align:center">{num}</p><p style="font-size:28px;font-weight:600;letter-spacing:-0.015em;line-height:1.15;white-space:nowrap;color:#0A1828">{tt}</p></div>
{crumbhtml(txt(cr))}
<p style="font-size:22px;line-height:1.5;color:#5B7591">{de}</p>
</div>''' for b,a,num,tt,cr,de in blocks)
    body=head('Så fungerar det',h1)+f'\n<div style="display:flex;gap:24px;align-items:stretch">\n{cards}\n</div>'
    out={'flode.html':sec('flode',body,aside_of(t),56)}
    # steps
    for f in sorted(glob.glob(d+'/steg*.html')):
        t=open(f).read(); name=f.split('/')[-1]; sid=re.search(r'<section id="([^"]+)"',t).group(1)
        num=re.search(r'border-radius:50%[^>]*>(\d+)</p>',t).group(1)
        cr=txt(re.search(r'border-radius:50%[^>]*>\d+</p><p[^>]*>(.*?)</p></div>',t,re.S).group(1))
        h2=txt(re.search(r'<h2[^>]*>(.*?)</h2>',t,re.S).group(1))
        imgs=re.findall(r'<img src="([^"]+)" alt="([^"]*)" style="width:(\d+)px;height:(\d+)px[^"]*"',t)
        note=re.search(r'</(?:div|img)>?\s*<p style="font-size:28px;color:#5B7591[^"]*">(.*?)</p>',t,re.S) or re.search(r'<p style="font-size:28px;color:#5B7591[^"]*">(.*?)</p>',t,re.S)
        phones=len(imgs)>1 and all(int(w)<500 for _,_,w,_ in imgs)
        MAXH=600 if note else 650
        def fit(w,h,maxw):
            w,h=int(w),int(h); s=min(1,MAXH/h,maxw/w); return int(w*s),int(h*s)
        if phones:
            im=''.join(f'<img src="{b}" alt="{a}" style="width:{fit(w,h,600)[0]}px;height:{fit(w,h,600)[1]}px;object-fit:contain">' for b,a,w,h in imgs)
            content=f'<div style="display:flex;gap:96px;justify-content:center">{im}</div>'
        else:
            inner=''.join(f'<img src="{b}" alt="{a}" style="width:{fit(w,h,1580//len(imgs))[0]}px;height:{fit(w,h,1580//len(imgs))[1]}px;object-fit:contain">' for b,a,w,h in imgs)
            content=f'<div style="display:flex;gap:24px;padding:24px;{CARD}">{inner}</div>'
        nb=f'\n<p style="font-size:24px;line-height:1.5;color:#5B7591;text-align:center;max-width:1400px">{note.group(1)}</p>' if note else ''
        body=head(f'Steg {num}',h2,cr)+'\n'+content+nb
        out[name]=sec(sid,body,aside_of(t))
    deck=d.split('/')[-3]
    print(deck, n, {k:len(v) for k,v in out.items()}, [ (len(re.findall('<img',v))) for v in out.values()])
    if not DRY:
        for k,v in out.items(): open(d+'/'+k,'w').write(v)
