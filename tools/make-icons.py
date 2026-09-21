"""Generates icons/icon{16,32,48,128}.png.

A takeUforward-blue rounded square carrying a chain-link mark: two open rings
joined by a bar, matching the glyph in the popup header.

    python tools/make-icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BRAND = (50, 124, 246, 255)  # #327CF6, takeUforward's primary
WHITE = (255, 255, 255, 255)
SIZES = (16, 32, 48, 128)
SS = 16  # supersample, then downscale for clean edges


def draw_icon(size: int) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=s * 0.22, fill=BRAND)

    stroke = s * 0.105
    r = s * 0.175
    cy = s / 2
    left_cx = s * 0.335
    right_cx = s * 0.665

    # PIL arcs run clockwise from 3 o'clock. Leave each ring open on the side
    # the joining bar comes from, so the two halves read as one link.
    d.arc(
        [left_cx - r, cy - r, left_cx + r, cy + r],
        start=48, end=312, fill=WHITE, width=round(stroke),
    )
    d.arc(
        [right_cx - r, cy - r, right_cx + r, cy + r],
        start=228, end=132, fill=WHITE, width=round(stroke),
    )

    half = stroke / 2
    d.rounded_rectangle(
        [left_cx - r * 0.1, cy - half, right_cx + r * 0.1, cy + half],
        radius=half, fill=WHITE,
    )

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
