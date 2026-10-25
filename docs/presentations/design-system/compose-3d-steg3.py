import sys
from PIL import Image, ImageDraw, ImageFilter
S=sys.argv[1]
base=Image.open(f'{S}/steg1-final.png').convert('RGB')
K=4; W,H=base.size
im=base.resize((W*K,H*K),Image.LANCZOS).convert('RGBA')
def P(*pts): return [(x*K,y*K) for x,y in pts]
# clear screen (polygon follows the inner bezel edge)
m=Image.new('L',(W*K,H*K),0); ImageDraw.Draw(m).polygon(P((509,152),(926,152),(910,300),(895,364),(476,364),(484,300)),fill=255)
m=m.filter(ImageFilter.GaussianBlur(K))
im=Image.composite(Image.new('RGBA',im.size,(190,200,209,255)),im,m)
NAVY=(10,24,40,255); GREEN=(69,179,107,255); MUT=(91,117,145,255); LINEC=(148,168,188,255)
rows=[(180,True,NAVY),(242,True,MUT),(304,False,MUT)]
for i,(y,ok,lc) in enumerate(rows):
    x0=530-i*6; x1=890-i*6
    sh=Image.new('RGBA',im.size,(0,0,0,0)); ds=ImageDraw.Draw(sh)
    ds.rounded_rectangle(P((x0,y+4),(x1,y+52)),radius=14*K,fill=(40,60,90,70))
    sh=sh.filter(ImageFilter.GaussianBlur(5*K)); im=Image.alpha_composite(im,sh); d=ImageDraw.Draw(im)
    d.rounded_rectangle(P((x0,y),(x1,y+48)),radius=14*K,fill=(252,253,255,255))
    cx=x0+14
    if ok:
        d.rounded_rectangle(P((cx,y+10),(cx+28,y+38)),radius=7*K,fill=(229,246,234,255),outline=GREEN,width=3*K)
        d.line(P((cx+7,y+24),(cx+12,y+30),(cx+22,y+17)),fill=GREEN,width=4*K,joint='curve')
    else:
        d.rounded_rectangle(P((cx,y+10),(cx+28,y+38)),radius=7*K,fill=(255,255,255,255),outline=LINEC,width=3*K)
    px=cx+52
    d.ellipse(P((px-8,y+9),(px+8,y+25)),fill=NAVY)
    d.pieslice(P((px-14,y+26),(px+14,y+54)),180,360,fill=NAVY)
    d.rounded_rectangle(P((px+26,y+19),(x1-24-(40 if i else 0),y+29)),radius=5*K,fill=lc if i==0 else MUT)
# arrow from monitor top-right out to the right
ar=Image.new('RGBA',im.size,(0,0,0,0)); da=ImageDraw.Draw(ar)
BLUE=(35,148,255,255)
import math
pts=[]
for t in [j/40 for j in range(41)]:
    x0,y0=(905,140); c=(975,70); x2,y2=(1045,80)
    x=(1-t)**2*x0+2*(1-t)*t*c[0]+t*t*x2; y=(1-t)**2*y0+2*(1-t)*t*c[1]+t*t*y2
    pts.append((x*K,y*K))
da.line(pts,fill=BLUE,width=9*K,joint='curve')
ex,ey=pts[-1]; px_,py_=pts[-4]; ang=math.atan2(ey-py_,ex-px_)
L=30*K
da.polygon([(ex+math.cos(ang)*10*K,ey+math.sin(ang)*10*K),(ex+math.cos(ang+2.5)*L,ey+math.sin(ang+2.5)*L),(ex+math.cos(ang-2.5)*L,ey+math.sin(ang-2.5)*L)],fill=BLUE)
im=Image.alpha_composite(im,ar)
im.convert('RGB').resize((W,H),Image.LANCZOS).save(f'{S}/steg3-final.png')
