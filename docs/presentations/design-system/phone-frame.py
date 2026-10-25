import sys, numpy as np
from PIL import Image, ImageDraw
S=sys.argv[1]
old=Image.open(f'{S}/artifact-files/0e785f80-8bb8-49a7-b865-8e07b8919348/d8a4d4b0ddd32918e54efc697e3d42d6.png').convert('RGBA')
a=np.asarray(old)
# island bbox: dark pixels in top area inside the screen
isl=(333,66,588,138)
X0,Y0,X1,Y1=46,36,874,1836; R=112
for src,out in [('app-new-1.png','phone-new-1.png'),('app-new-2.png','phone-new-2.png')]:
    scr=Image.open(f'{S}/{src}').convert('RGBA').resize((X1-X0,Y1-Y0),Image.LANCZOS)
    K=4; m=Image.new('L',((X1-X0)*K,(Y1-Y0)*K),0); ImageDraw.Draw(m).rounded_rectangle([0,0,(X1-X0)*K-1,(Y1-Y0)*K-1],radius=R*K,fill=255)
    m=m.resize((X1-X0,Y1-Y0),Image.LANCZOS)
    im=old.copy(); im.paste(scr,(X0,Y0),m)
    d=ImageDraw.Draw(im); h=isl[3]-isl[1]; d.rounded_rectangle(isl,radius=h//2,fill=(0,0,0,255))
    im.save(f'{S}/{out}')
