"""ERC-20 privacy: before/after. Same transfer public (exposed, red) then
private (redacted + lock, green). Straight from your wallet."""
import os
import numpy as np
import imageio.v2 as imageio
from PIL import Image
from renderer import (
    INK, GRAY, GREEN, RED, SS, sx, fade, font, text_c, phase, arrow, box,
    rough_round_rect, new_frame, save_gif, center_offset, check_margins,
)

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT_DIR, exist_ok=True)

# Fonts
f_title = font(52)
f_sub = font(29)
f_head = font(32)
f_wallet = font(27)
f_addr = font(27)
f_amt = font(33)
f_tag = font(25)
f_punch = font(44)

# ---- raw 1x layout -------------------------------------------------------
TITLE_Y, SUB_Y = 0, 60
WALLET_CX, WALLET_W, WALLET_H = 110, 190, 120
TX_CX, TX_W, TX_H = 560, 360, 140

BEFORE_HEAD_Y, BEFORE_Y, BEFORE_TAG_Y = 150, 250, 335
AFTER_HEAD_Y, AFTER_Y, AFTER_TAG_Y = 430, 530, 615
PUNCH_Y = 710

ARROW_X0 = WALLET_CX + WALLET_W / 2 + 5    # wallet right edge + gap
ARROW_X1 = TX_CX - TX_W / 2 - 8            # card left edge - gap

BOUNDS = (10, -30, 745, 745)
check_margins(BOUNDS)
DX, DY = center_offset(BOUNDS)
X = lambda v: v + DX
Y = lambda v: v + DY


def redact(d, cx, cy, w, h, a):
    """Solid gray redaction bar (hidden data)."""
    d.rounded_rectangle(
        [sx(X(cx - w / 2)), sx(Y(cy - h / 2)), sx(X(cx + w / 2)), sx(Y(cy + h / 2))],
        radius=sx(8), fill=fade(GRAY, a),
    )


def lock(d, cx, cy, a, color=GREEN):
    """Tiny padlock glyph."""
    bw, bh = 32, 26
    rough_round_rect(d, sx(X(cx - bw / 2)), sx(Y(cy - bh / 2)), sx(bw), sx(bh),
                     sx(6), a, 9001, color)
    r = 10
    d.arc(
        [sx(X(cx - r)), sx(Y(cy - bh / 2 - r - 1)),
         sx(X(cx + r)), sx(Y(cy - bh / 2 + r - 1))],
        180, 360, fill=fade(color, a), width=max(1, round(2.4 * SS)),
    )


def wallet(d, cy, a):
    box(d, X(WALLET_CX), Y(cy), WALLET_W, WALLET_H, a, 100 + int(cy), color=INK)
    text_c(d, "wallet", X(WALLET_CX), Y(cy), f_wallet, INK, a)


# ---- timing --------------------------------------------------------------
TOTAL = 192
frames = []
for f in range(TOTAL):
    img, d = new_frame()

    # Title + subtitle
    text_c(d, "ERC-20 goes private", X(377), Y(TITLE_Y), f_title, INK, phase(f, 4, 15))
    text_c(d, "same transfer, straight from your wallet",
           X(377), Y(SUB_Y), f_sub, GRAY, phase(f, 14, 15))

    # ---------- BEFORE row: PUBLIC (exposed) ----------
    text_c(d, "PUBLIC", X(TX_CX), Y(BEFORE_HEAD_Y), f_head, RED, phase(f, 28, 14))
    wallet(d, BEFORE_Y, phase(f, 30, 15))
    arrow(d, (X(ARROW_X0), Y(BEFORE_Y)), (X(ARROW_X1), Y(BEFORE_Y)), phase(f, 44, 14), 201, color=RED)

    a = phase(f, 58, 15)
    box(d, X(TX_CX), Y(BEFORE_Y), TX_W, TX_H, a, 210, color=RED)
    ac = phase(f, 66, 14)
    text_c(d, "0xA1f9 -> 0xB2c4", X(TX_CX), Y(BEFORE_Y - 26), f_addr, INK, ac)
    text_c(d, "1,000 USDC", X(TX_CX), Y(BEFORE_Y + 24), f_amt, RED, ac)
    text_c(d, "anyone can read it", X(TX_CX), Y(BEFORE_TAG_Y), f_tag, RED, phase(f, 78, 14))

    # ---------- AFTER row: PRIVATE (shielded) ----------
    text_c(d, "PRIVATE", X(TX_CX), Y(AFTER_HEAD_Y), f_head, GREEN, phase(f, 96, 14))
    wallet(d, AFTER_Y, phase(f, 100, 15))
    arrow(d, (X(ARROW_X0), Y(AFTER_Y)), (X(ARROW_X1), Y(AFTER_Y)), phase(f, 114, 14), 202, color=GREEN)

    a = phase(f, 128, 15)
    box(d, X(TX_CX), Y(AFTER_Y), TX_W, TX_H, a, 220, color=GREEN)
    ac = phase(f, 138, 14)
    if ac > 0:
        lock(d, TX_CX - 128, AFTER_Y, ac, GREEN)
        redact(d, TX_CX + 20, AFTER_Y - 26, 210, 30, ac)   # hidden addresses
        redact(d, TX_CX + 20, AFTER_Y + 24, 150, 30, ac)   # hidden amount
    text_c(d, "hidden on-chain", X(TX_CX), Y(AFTER_TAG_Y), f_tag, GREEN, phase(f, 150, 14))

    # ---------- Punchline ----------
    text_c(d, "Privacy, straight from your wallet",
           X(377), Y(PUNCH_Y), f_punch, INK, phase(f, 168, 16))

    frames.append(img.resize((1080, 1080), Image.LANCZOS))

# ---- save GIF + MP4 ------------------------------------------------------
gif_path = os.path.join(OUT_DIR, "erc20_privacy.gif")
mp4_path = os.path.join(OUT_DIR, "erc20_privacy.mp4")
save_gif(frames, gif_path)

HOLD = 60
full = frames + [frames[-1]] * HOLD
w = imageio.get_writer(mp4_path, fps=30, codec="libx264", quality=8,
                       macro_block_size=1, pixelformat="yuv420p")
for fr in full:
    w.append_data(np.asarray(fr))
w.close()
print("saved", mp4_path, "frames:", len(full))
