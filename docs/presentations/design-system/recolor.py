import sys,numpy as np
from PIL import Image
import colorsys
# site --blue #2394FF: h=209°, s=.86, v=1
def rc(src,dst):
    im=Image.open(src).convert('RGBA'); a=np.asarray(im).astype(float)/255
    rgb=a[...,:3]; mx=rgb.max(-1); mn=rgb.min(-1); d=mx-mn
    s=np.where(mx>0,d/np.maximum(mx,1e-6),0)
    r,g,b=rgb[...,0],rgb[...,1],rgb[...,2]
    h=np.zeros_like(mx); m=d>1e-6
    h=np.where(m&(mx==b),(4+(r-g)/np.maximum(d,1e-6))/6,h)
    h=np.where(m&(mx==g),(2+(b-r)/np.maximum(d,1e-6))/6,h)
    h=np.where(m&(mx==r),((g-b)/np.maximum(d,1e-6)/6)%1,h)
    sel=(h>195/360)&(h<250/360)&(s>0.2)&(mx>0.45)
    # blend toward site blue by how saturated the pixel is (keeps white antialias)
    t=np.clip(s/0.885,0,1)[...,None]
    blue=np.array([0x23,0x94,0xFF])/255
    new=(1-t)*np.ones(3)*mx[...,None]+t*blue*mx[...,None]/1.0
    rgb2=np.where(sel[...,None],new,rgb)
    out=np.concatenate([rgb2,a[...,3:]],-1)
    Image.fromarray((np.clip(out,0,1)*255).astype('uint8')).save(dst)
for p in sys.argv[1:]:
    src,dst=p.split('=');rc(src,dst)
