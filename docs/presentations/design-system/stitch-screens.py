import sys
from PIL import Image
def stitch(rows):
    # rows: list of lists of paths
    ims=[[Image.open(p).convert('RGB') for p in r] for r in rows]
    W=sum(i.width for i in ims[0]); H=sum(r[0].height for r in ims)
    out=Image.new('RGB',(W,H),'white'); y=0
    for r in ims:
        x=0
        for i in r: out.paste(i,(x,y)); x+=i.width
        y+=r[0].height
    return out
def cut_cols(im,x0,x1,y0=0,y1=None):
    y1=im.height if y1 is None else y1
    part=im.crop((0,y0,im.width,y1))
    left=part.crop((0,0,x0,part.height)); right=part.crop((x1,0,part.width,part.height))
    o=Image.new('RGB',(left.width+right.width,part.height),'white'); o.paste(left,(0,0)); o.paste(right,(left.width,0)); return o
def vstack(parts):
    W=max(p.width for p in parts); o=Image.new('RGB',(W,sum(p.height for p in parts)),'white'); y=0
    for p in parts: o.paste(p,(0,y)); y+=p.height
    return o
