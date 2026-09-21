"""Generates icons/icon{16,32,48,128}.png.

takeUforward's brand blue with the universal external-link mark on it: a bracket
open on one side and an arrow leaving through the corner. It says "this sends
the problem somewhere else" at 16px, which is the whole job of the extension.

    python tools/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = (50, 124, 246, 255)  # #327CF6, takeUforward's --color-brand-primary
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
SS = 16  # supersample, then downscale for clean edges


def draw_icon(size: int) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=BRAND)

    w = s * 0.085          # stroke weight
    r = w * 0.5
    left, top = s * 0.20, s * 0.335
    right, bottom = s * 0.665, s * 0.80

    # Bracket: left, bottom and the two stubs, leaving the top-right open.
    d.rounded_rectangle([left, top, left + w, bottom], radius=r, fill=WHITE)
    d.rounded_rectangle([left, bottom - w, right, bottom], radius=r, fill=WHITE)
    d.rounded_rectangle([right - w, bottom - s * 0.20, right, bottom], radius=r, fill=WHITE)
    d.rounded_rectangle([left, top, left + s * 0.20, top + w], radius=r, fill=WHITE)

    # Arrow leaving through the top-right corner.
    tip_x, tip_y = s * 0.815, s * 0.205
    tail_x, tail_y = s * 0.475, s * 0.545
    d.line([(tail_x, tail_y), (tip_x, tip_y)], fill=WHITE, width=round(w), joint="curve")

    head = s * 0.215
    d.rounded_rectangle([tip_x - head, tip_y, tip_x, tip_y + w], radius=r, fill=WHITE)
    d.rounded_rectangle([tip_x - w, tip_y, tip_x, tip_y + head], radius=r, fill=WHITE)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    out = ROOT / "icons"
    out.mkdir(exist_ok=True)
    for size in SIZES:
        path = out / f"icon{size}.png"
        draw_icon(size).save(path)
        print(f"icons/icon{size}.png  {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
