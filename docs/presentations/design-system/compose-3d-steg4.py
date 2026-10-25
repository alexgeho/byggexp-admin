import sys, numpy as np
from PIL import Image, ImageDraw, ImageFilter
S=sys.argv[1]; K=4
base=Image.open(f'{S}/3d/steg4-raw.png').convert('RGB'); W,H=base.size
im=base.resize((W*K,H*K),Image.LANCZOS).convert('RGBA')
GREEN=(69,179,107,255)
cx,cy,r=658,311,109
# soft shadow under the ball
sh=Image.new('RGBA',im.size,(0,0,0,0)); ImageDraw.Draw(sh).ellipse([(cx-r+6)*K,(cy-r+14)*K,(cx+r+6)*K,(cy+r+14)*K],fill=(30,60,40,70))
im=Image.alpha_composite(im,sh.filter(ImageFilter.GaussianBlur(12*K)))
# clay ball: light-green radial shading
R=r*K; yy,xx=np.mgrid[-R:R,-R:R].astype(float)
dist=np.hypot(xx,yy)/R; hl=np.hypot(xx+R*0.35,yy+R*0.4)/R
top=np.array([240,250,243]); bot=np.array([205,234,214])
t=np.clip(hl/1.6,0,1)[...,None]; col=top*(1-t)+bot*t
alpha=np.clip((1-dist)*R/1.5,0,1)*255
ball=Image.fromarray(np.dstack([col,alpha]).astype(np.uint8),'RGBA')
im.alpha_composite(ball,((cx-r)*K,(cy-r)*K))
# tick with a soft inner shadow
d=ImageDraw.Draw(im)
pts=[(cx-r*0.42,cy+r*0.02),(cx-r*0.1,cy+r*0.34),(cx+r*0.46,cy-r*0.3)]
w=r*0.2
def tick(layer,off,fill):
    dd=ImageDraw.Draw(layer); p=[((x+off)*K,(y+off)*K) for x,y in pts]
    dd.line(p,fill=fill,width=int(w*K),joint='curve')
    for x,y in (p[0],p[-1]): dd.ellipse([x-w*K/2,y-w*K/2,x+w*K/2,y+w*K/2],fill=fill)
sh=Image.new('RGBA',im.size,(0,0,0,0)); tick(sh,3,(30,90,50,90))
im=Image.alpha_composite(im,sh.filter(ImageFilter.GaussianBlur(3*K)))
tk=Image.new('RGBA',im.size,(0,0,0,0)); tick(tk,0,GREEN); im=Image.alpha_composite(im,tk)
# real Fortnox badge (cut from the approved 2D step 4)
badge=Image.open(f'{S}/recolor/out/lucas-4.png').convert('RGB').crop((111,33,371,123))
bs=1.45; bw,bh=int(badge.width*bs*K),int(badge.height*bs*K)
badge=badge.resize((bw,bh),Image.LANCZOS)
m=Image.new('L',(bw,bh),0); ImageDraw.Draw(m).rounded_rectangle([0,0,bw,bh],radius=26*K,fill=255)
bx,by=110*K,60*K
sh=Image.new('RGBA',im.size,(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle([bx+4*K,by+12*K,bx+bw,by+bh+12*K],radius=24*K,fill=(10,40,20,60))
im=Image.alpha_composite(im,sh.filter(ImageFilter.GaussianBlur(12*K)))
im.paste(badge,(bx,by),m)
im.convert('RGB').resize((W,H),Image.LANCZOS).save(f'{S}/3d/steg4-final.png')
