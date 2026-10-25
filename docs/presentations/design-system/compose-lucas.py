from PIL import Image,ImageDraw
import math
S='/private/tmp/claude-501/-Users-alexandergerhard-Bygg-exp-dev-byggexp-admin/3b5f8ae0-801f-4801-8100-94f0dc10c15c/scratchpad/recolor'
K=4
NAVY=(10,24,40);GREEN=(69,179,107);GSOFT=(227,244,233);BLUE=(35,148,255);LINE=(10,24,40)
def big(p): im=Image.open(p).convert('RGB'); return im.resize((im.width*K,im.height*K),Image.LANCZOS)
def s(*v): return [x*K for x in v]
def tick(d,cx,cy,r,w):
    pts=[(cx-r*0.45,cy+r*0.02),(cx-r*0.1,cy+r*0.35),(cx+r*0.48,cy-r*0.3)]
    pts=[(x*K,y*K) for x,y in pts]
    d.line(pts,fill=GREEN,width=int(w*K),joint='curve')
    for x,y in (pts[0],pts[-1]): d.ellipse([x-w*K/2,y-w*K/2,x+w*K/2,y+w*K/2],fill=GREEN)
def ball(d,cx,cy,r):
    d.ellipse(s(cx-r,cy-r,cx+r,cy+r),fill=GSOFT)
    tick(d,cx,cy,r,r*0.2)
def person(d,cx,cy,r):
    d.ellipse(s(cx-r*0.45,cy-r,cx+r*0.45,cy-r*0.1),fill=NAVY)
    d.pieslice(s(cx-r,cy-r*0.05,cx+r,cy+r*1.6),180,360,fill=NAVY)
# step 3: same woman + same computer as step 1, screen = list with green checked boxes, arrow to ball
im=big(S+'/out/lucas-1.png');d=ImageDraw.Draw(im)
d.polygon(s(340,108, 628,106, 614,250, 322,252),fill=(255,255,255))
for i,y in enumerate((135,180,225)):
    x=360
    d.rounded_rectangle(s(x,y-16,x+32,y+16),radius=7*K,fill=GSOFT,outline=GREEN,width=3*K)
    tick(d,x+16,y,16,5)
    person(d,x+62,y+2,13)
    d.rounded_rectangle(s(x+90,y-5,x+90+(150-i*25),y+5),radius=5*K,fill=NAVY if i==0 else (91,117,145))
# arrow flies out of the computer to the right, towards step 4
pts=[]
for i in range(41):
    u=i/40; x=600+128*u; y=95-70*math.sin(math.pi*u*0.5)+0*u
    pts.append((x*K,y*K))
d.line(pts[:-3],fill=BLUE,width=8*K,joint='curve')
ex,ey=pts[-1];px,py=pts[-4];ang=math.atan2(ey-py,ex-px)
hl=26*K;d.polygon([(ex+6*K*math.cos(ang),ey+6*K*math.sin(ang)),(ex-hl*math.cos(ang-0.5),ey-hl*math.sin(ang-0.5)),(ex-hl*math.cos(ang+0.5),ey-hl*math.sin(ang+0.5))],fill=BLUE)
im.resize((740,740),Image.LANCZOS).save(S+'/out/lucas-3v2.png')
# step 4: no dark Fortnox badge, check circle in site green style
im=big(S+'/out/lucas-4.png');d=ImageDraw.Draw(im)
ball(d,443,210,74)
im.resize((740,740),Image.LANCZOS).save(S+'/out/lucas-4v2.png')
o=Image.new('RGB',(1480,740),'white');o.paste(Image.open(S+'/out/lucas-3v2.png'),(0,0));o.paste(Image.open(S+'/out/lucas-4v2.png'),(740,0));o.save(S+'/v2.png')
