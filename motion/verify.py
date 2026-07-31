from PIL import Image
import numpy as np
gif = Image.open("out/erc20_privacy.gif")
frames = []
try:
    while True:
        frames.append(gif.copy().convert("RGB")); gif.seek(gif.tell()+1)
except EOFError: pass
n = len(frames); print("frame count:", n)
a0 = np.asarray(frames[0]); print("frame0 mean:", a0.mean(axis=(0,1)).round(1))
last = frames[n-62]  # a fully-drawn frame before the long hold tail
fr = np.asarray(last)
def cnt(region, cond):
    r=region[:,:,0].astype(int); g=region[:,:,1].astype(int); b=region[:,:,2].astype(int)
    return int(cond(r,g,b).sum())
top = fr[360:520, :, :]   # BEFORE (public) band, screen coords
bot = fr[640:800, :, :]   # AFTER (private) band
red = lambda r,g,b:(r>150)&(r>g+40)&(r>b+40)
grn = lambda r,g,b:(g>140)&(g>r+30)&(g>b+20)
print("BEFORE band  RED:", cnt(top,red), " GREEN:", cnt(top,grn))
print("AFTER  band  RED:", cnt(bot,red), " GREEN:", cnt(bot,grn))
# directional arrow check on an early arrow frame (~f=50 public arrow growing)
ea = np.asarray(frames[50])
band = ea[420:445, :, :]  # thin strip through BEFORE arrow line
xs = np.where(red(band[:,:,0].astype(int),band[:,:,1].astype(int),band[:,:,2].astype(int)).any(axis=0))[0]
print("f50 red arrow x-span:", (int(xs.min()), int(xs.max())) if len(xs) else "none")
for i in [0, 70, n-90, n-62]:
    frames[i].save(f"out/frame_{i:03d}.png")
print("saved:", [f"frame_{i:03d}.png" for i in [0,70,n-90,n-62]])
