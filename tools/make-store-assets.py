"""Generates the Chrome Web Store graphic assets into store/assets/.

    python tools/make-store-assets.py

The store requires JPEG or 24-bit PNG with no alpha channel, so everything here
is flattened to RGB before saving.

  store-icon-128.png        128x128   required
  promo-small-440x280.png   440x280   optional, drives placement
  promo-marquee-1400x560.png 1400x560 optional
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store" / "assets"

BRAND = (50, 124, 246)       # #327CF6, takeUforward's primary
BRAND_DEEP = (29, 41, 64)    # #1D2940
BG = (10, 13, 20)
WHITE = (255, 255, 255)
MUTED = (163, 172, 186)
SS = 8                       # supersample factor for the mark


def font(size, bold=True):
    for name in (("segoeuib.ttf", "seguisb.ttf", "arialbd.ttf") if bold
                 else ("segoeui.ttf", "arial.ttf")):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def draw_mark(size, plate=True):
    """The external-link glyph, optionally on its rounded brand plate."""
    s = size * SS
    img = Image.new("RGB", (s, s), BRAND if plate else BG)
    d = ImageDraw.Draw(img)
    if plate:
        # Rounded corners, drawn by masking later.
        pass

    w = s * 0.085
    r = w * 0.5
    left, top = s * 0.20, s * 0.335
    right, bottom = s * 0.665, s * 0.80
    colour = WHITE if plate else BRAND

    d.rounded_rectangle([left, top, left + w, bottom], radius=r, fill=colour)
    d.rounded_rectangle([left, bottom - w, right, bottom], radius=r, fill=colour)
    d.rounded_rectangle([right - w, bottom - s * 0.20, right, bottom], radius=r, fill=colour)
    d.rounded_rectangle([left, top, left + s * 0.20, top + w], radius=r, fill=colour)

    tip_x, tip_y = s * 0.815, s * 0.205
    d.line([(s * 0.475, s * 0.545), (tip_x, tip_y)], fill=colour, width=round(w), joint="curve")
    head = s * 0.215
    d.rounded_rectangle([tip_x - head, tip_y, tip_x, tip_y + w], radius=r, fill=colour)
    d.rounded_rectangle([tip_x - w, tip_y, tip_x, tip_y + head], radius=r, fill=colour)

    return img.resize((size, size), Image.LANCZOS)


def rounded_plate(size, radius_ratio=0.22, bg=BG):
    """The mark on a rounded brand plate, composited onto an opaque background."""
    s = size * SS
    plate = Image.new("RGB", (s, s), BRAND)
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, s - 1, s - 1],
                                           radius=s * radius_ratio, fill=255)
    glyph = draw_mark(size, plate=True).resize((s, s), Image.NEAREST)
    plate.paste(glyph, (0, 0))

    out = Image.new("RGB", (s, s), bg)
    out.paste(plate, (0, 0), mask)
    return out.resize((size, size), Image.LANCZOS)


def store_icon():
    return rounded_plate(128, bg=BG)


def promo(width, height, mark_size, title_size, sub_size, gap):
    img = Image.new("RGB", (width, height), BG)
    d = ImageDraw.Draw(img)

    # A soft brand wash down the left edge, so the tile is not flat black.
    for x in range(width // 2):
        blend = (1 - x / (width / 2)) ** 2 * 0.22
        col = tuple(round(BG[i] + (BRAND_DEEP[i] - BG[i]) * blend) for i in range(3))
        d.line([(x, 0), (x, height)], fill=col)

    mark = rounded_plate(mark_size, bg=BG)
    mx = round(width * 0.075)
    my = round((height - mark_size) / 2 - height * 0.06)
    img.paste(mark, (mx, my))

    tx = mx + mark_size + gap
    title_font = font(title_size, bold=True)
    sub_font = font(sub_size, bold=False)

    title = "TUF External\nLink Redirect"
    d.multiline_text((tx, my), title, font=title_font, fill=WHITE, spacing=round(title_size * 0.22))

    bbox = d.multiline_textbbox((tx, my), title, font=title_font, spacing=round(title_size * 0.22))
    sub_y = bbox[3] + round(height * 0.045)
    d.text((tx, sub_y), "LeetCode & GeeksforGeeks links,", font=sub_font, fill=MUTED)
    d.text((tx, sub_y + round(sub_size * 1.45)), "right inside the takeUforward sheet",
           font=sub_font, fill=MUTED)

    return img


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    assets = {
        "store-icon-128.png": store_icon(),
        "promo-small-440x280.png": promo(440, 280, 84, 26, 14, 20),
        "promo-marquee-1400x560.png": promo(1400, 560, 208, 68, 34, 52),
    }
    for name, img in assets.items():
        path = OUT / name
        assert img.mode == "RGB", name + " still has an alpha channel"
        img.save(path)
        print(f"store/assets/{name}  {img.size[0]}x{img.size[1]}  {path.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
