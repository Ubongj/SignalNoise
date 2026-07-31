"""Excalidraw dark-mode renderer: bowed bezier strokes, rounded rects, directional arrows."""
from PIL import Image, ImageDraw, ImageFont
import math
import os
import random

SIZE = 1080
SS = 3
W = SIZE * SS
FPS = 30

BG = (18, 18, 18)
INK = (222, 222, 227)
GRAY = (148, 148, 155)
RED = (255, 118, 118)
GREEN = (105, 211, 134)
PURPLE = (177, 151, 252)
YELLOW = (250, 208, 100)

FONT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "assets", "fonts", "Excalifont.ttf")
LW = 2.6


def font(size):
    return ImageFont.truetype(FONT_PATH, size * SS)


def sx(v):
    return int(v * SS)


def ease_out_cubic(t):
    return 1 - (1 - t) ** 3


def clamp01(t):
    return max(0.0, min(1.0, t))


def phase(f, delay, dur):
    return ease_out_cubic(clamp01((f - delay) / dur))


def fade(c, a):
    return tuple(int(BG[i] + (c[i] - BG[i]) * a) for i in range(3))


def _bezier(p0, p1, p2, n=26):
    out = []
    for i in range(n + 1):
        t = i / n
        out.append(((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t ** 2 * p2[0],
                    (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t ** 2 * p2[1]))
    return out


def bowed_pts(p1, p2, rnd):
    x1, y1 = p1
    x2, y2 = p2
    dist = math.hypot(x2 - x1, y2 - y1)
    j = 1.4 * SS
    a = (x1 + rnd.uniform(-j, j), y1 + rnd.uniform(-j, j))
    b = (x2 + rnd.uniform(-j, j), y2 + rnd.uniform(-j, j))
    px, py = -(y2 - y1), (x2 - x1)
    L = math.hypot(px, py) or 1
    px, py = px / L, py / L
    bow = max(-6 * SS, min(6 * SS, rnd.uniform(-0.018, 0.018) * dist))
    mid = ((a[0] + b[0]) / 2 + px * bow, (a[1] + b[1]) / 2 + py * bow)
    return _bezier(a, mid, b)


def rough_line(d, p1, p2, color, a, seed, width=LW):
    if a <= 0:
        return
    col = fade(color, a)
    w = max(1, round(width * SS))
    for k in range(2):
        d.line(bowed_pts(p1, p2, random.Random(seed * 31 + k)), fill=col, width=w, joint="curve")


def _arc(cx, cy, r, a0, a1, rnd, n=10):
    out = []
    for i in range(n + 1):
        t = a0 + (a1 - a0) * i / n
        rr = r + rnd.uniform(-0.8 * SS, 0.8 * SS)
        out.append((cx + rr * math.cos(t), cy + rr * math.sin(t)))
    return out


def rough_round_rect(d, x, y, w, h, r, a, seed, color=INK, width=LW, fill_bg=True):
    """x, y, w, h, r are already in SS units."""
    if a <= 0:
        return
    if fill_bg:
        d.rounded_rectangle([x, y, x + w, y + h], radius=r, fill=BG)
    col = fade(color, a)
    lw = max(1, round(width * SS))
    for k in range(2):
        rnd = random.Random(seed * 47 + k)
        path = []
        path += bowed_pts((x + r, y), (x + w - r, y), rnd)
        path += _arc(x + w - r, y + r, r, -math.pi / 2, 0, rnd)
        path += bowed_pts((x + w, y + r), (x + w, y + h - r), rnd)
        path += _arc(x + w - r, y + h - r, r, 0, math.pi / 2, rnd)
        path += bowed_pts((x + w - r, y + h), (x + r, y + h), rnd)
        path += _arc(x + r, y + h - r, r, math.pi / 2, math.pi, rnd)
        path += bowed_pts((x, y + h - r), (x, y + r), rnd)
        path += _arc(x + r, y + r, r, math.pi, math.pi * 1.5, rnd)
        d.line(path, fill=col, width=lw, joint="curve")


def box(d, cx, cy, w, h, a, seed, color=INK, r=20):
    rough_round_rect(d, sx(cx - w / 2), sx(cy - h / 2), sx(w), sx(h), sx(r), a, seed, color)


def text_c(d, text, cx, cy, fnt, color, a):
    if a <= 0:
        return
    bb = d.textbbox((0, 0), text, font=fnt)
    d.text((sx(cx) - (bb[2] - bb[0]) / 2 - bb[0], sx(cy) - (bb[3] - bb[1]) / 2 - bb[1]),
           text, font=fnt, fill=fade(color, a))


def _partial(pts, prog):
    total = sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
                for i in range(len(pts) - 1))
    target = total * prog
    run = 0.0
    out = [pts[0]]
    for i in range(len(pts) - 1):
        seg = math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1])
        if run + seg >= target:
            r = (target - run) / seg if seg else 0
            out.append((pts[i][0] + (pts[i + 1][0] - pts[i][0]) * r,
                        pts[i][1] + (pts[i + 1][1] - pts[i][1]) * r))
            return out
        out.append(pts[i + 1])
        run += seg
    return out


def arrow(d, p1, p2, prog, seed, color=INK, head=True, width=LW):
    """p1, p2 in 1x coords. Grows from p1 toward p2; head rides the tip."""
    if prog <= 0:
        return
    prog = min(1.0, prog)
    a = (sx(p1[0]), sx(p1[1]))
    b = (sx(p2[0]), sx(p2[1]))
    col = fade(color, 1.0)
    w = max(1, round(width * SS))
    tip, back = b, a
    for k in range(2):
        drawn = _partial(bowed_pts(a, b, random.Random(seed * 53 + k)), prog)
        d.line(drawn, fill=col, width=w, joint="curve")
        if k == 0 and len(drawn) > 1:
            tip, back = drawn[-1], drawn[-2]
    if head:
        ang = math.atan2(tip[1] - back[1], tip[0] - back[0])
        hl = 15 * SS
        for da in (math.pi * 5 / 6, -math.pi * 5 / 6):
            d.line([tip, (tip[0] + hl * math.cos(ang + da), tip[1] + hl * math.sin(ang + da))],
                   fill=col, width=w)


MARGIN = 100  # minimum breathing room on every side, 1x units


def center_offset(bounds):
    """bounds: (x0, y0, x1, y1) of all content in 1x coords.
    Returns (dx, dy) to add to every coordinate so the scene sits dead center."""
    x0, y0, x1, y1 = bounds
    dx = (SIZE - (x1 - x0)) / 2 - x0
    dy = (SIZE - (y1 - y0)) / 2 - y0
    return dx, dy


def check_margins(bounds):
    """Assert the scene fits with breathing room. Call before rendering."""
    x0, y0, x1, y1 = bounds
    w, h = x1 - x0, y1 - y0
    assert w <= SIZE - 2 * MARGIN, f"content {w:.0f}px wide, max {SIZE - 2 * MARGIN}"
    assert h <= SIZE - 2 * MARGIN, f"content {h:.0f}px tall, max {SIZE - 2 * MARGIN}"
    return True


def new_frame():
    img = Image.new("RGB", (W, W), BG)
    return img, ImageDraw.Draw(img)


# ---------------------------------------------------------------- brand logos

_LOGO_CACHE = {}
_LOGO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "logos")
SIMPLE_ICONS = ("https://raw.githubusercontent.com/simple-icons/simple-icons"
                "/master/icons/{slug}.svg")


def load_logo(slug, color=INK, size=256):
    """Fetch an official brand mark from Simple Icons, tint it, rasterize it.

    slug is the Simple Icons slug: github, vercel, docker, redis, postgresql,
    amazonaws, cloudflare, stripe, supabase, kubernetes, nginx, python, go...
    Cached on disk, so repeat calls are free.
    """
    hexcol = "#%02X%02X%02X" % color
    key = (slug, hexcol, size)
    if key in _LOGO_CACHE:
        return _LOGO_CACHE[key]

    os.makedirs(_LOGO_DIR, exist_ok=True)
    svg_path = os.path.join(_LOGO_DIR, f"{slug}.svg")
    if not os.path.exists(svg_path):
        import urllib.request
        url = SIMPLE_ICONS.format(slug=slug)
        try:
            with urllib.request.urlopen(url, timeout=20) as r:
                open(svg_path, "wb").write(r.read())
        except Exception as e:
            raise RuntimeError(
                f"could not fetch logo '{slug}' from Simple Icons ({e}). "
                f"Check the slug at simpleicons.org, or hand-draw the glyph instead."
            )

    import cairosvg
    src = open(svg_path).read()
    src = src.replace("<path ", f'<path fill="{hexcol}" ')  # simple-icons paths carry no fill
    png = os.path.join(_LOGO_DIR, f"{slug}_{hexcol.lstrip('#')}_{size}.png")
    cairosvg.svg2png(bytestring=src.encode(), write_to=png,
                     output_width=size, output_height=size)
    img = Image.open(png).convert("RGBA")
    _LOGO_CACHE[key] = img
    return img


def logo(img, slug, cx, cy, size, a, color=INK):
    """Composite a real brand mark centered on (cx, cy), 1x coords, faded to alpha a.

    Pass the frame IMAGE, not the draw handle. Call it in the same phase as the
    box it sits in so the logo reveals with the sketch, never pops in.
    """
    if a <= 0:
        return
    lg = load_logo(slug, color).resize((int(size * SS), int(size * SS)), Image.LANCZOS)
    if a < 1:
        lg.putalpha(lg.split()[3].point(lambda v: int(v * a)))
    img.paste(lg, (int(sx(cx) - lg.width / 2), int(sx(cy) - lg.height / 2)), lg)


def save_gif(frames, path, hold=60):
    frames = frames + [frames[-1]] * hold
    small = [f.resize((SIZE, SIZE), Image.LANCZOS) if f.size != (SIZE, SIZE) else f for f in frames]
    small[0].save(path, save_all=True, append_images=small[1:],
                  duration=int(1000 / FPS), loop=0, optimize=False)
    print("saved", path, "frames:", len(small))
