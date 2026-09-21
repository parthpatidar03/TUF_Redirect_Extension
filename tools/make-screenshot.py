"""Turns any screenshot into a Chrome Web Store compliant image.

    python tools/make-screenshot.py                 # newest image from the usual folders
    python tools/make-screenshot.py shot.png ...    # specific files
    python tools/make-screenshot.py --crop shot.png # fill the frame instead of padding

The store rejects anything that is not exactly 1280x800 or 640x400, and rejects
PNGs that carry an alpha channel. Output is 1280x800 RGB PNG in store/assets/.

By default the image is scaled to fit and the rest padded with the colour
sampled from its corners, which on takeUforward's dark theme reads as one piece.
--crop scales to fill and centre-crops instead, losing the edges.
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "store" / "assets"
TARGET = (1280, 800)
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp"}

SEARCH = [
    Path.home() / "Pictures" / "Screenshots",
    Path.home() / "OneDrive" / "Pictures" / "Screenshots",
    Path.home() / "Pictures",
    Path.home() / "Downloads",
    Path.home() / "Desktop",
]


def newest_images(limit=5):
    found = []
    for folder in SEARCH:
        if not folder.is_dir():
            continue
        for p in folder.iterdir():
            if p.is_file() and p.suffix.lower() in EXTS:
                found.append(p)
    found.sort(key=lambda p: p.stat().st_mtime, reverse=True)
    return found[:limit]


def pad_colour(img):
    """Sample the four corners; screenshots of a dark page give a dark frame."""
    w, h = img.size
    pts = [(2, 2), (w - 3, 2), (2, h - 3), (w - 3, h - 3)]
    px = [img.getpixel(p) for p in pts]
    return tuple(round(sum(c[i] for c in px) / len(px)) for i in range(3))


def convert(path, crop=False):
    img = Image.open(path).convert("RGB")
    tw, th = TARGET

    if crop:
        scale = max(tw / img.width, th / img.height)
        resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        left = (resized.width - tw) // 2
        top = (resized.height - th) // 2
        return resized.crop((left, top, left + tw, top + th))

    scale = min(tw / img.width, th / img.height)
    resized = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", TARGET, pad_colour(img))
    canvas.paste(resized, ((tw - resized.width) // 2, (th - resized.height) // 2))
    return canvas


def main():
    args = [a for a in sys.argv[1:] if a != "--crop"]
    crop = "--crop" in sys.argv[1:]

    if args:
        sources = [Path(a) for a in args]
        missing = [p for p in sources if not p.is_file()]
        if missing:
            print("not found:\n  " + "\n  ".join(str(p) for p in missing))
            return 1
    else:
        sources = newest_images()
        if not sources:
            print("No images found. Pass the file path instead:\n"
                  "  python tools/make-screenshot.py \"C:\\path\\to\\shot.png\"")
            return 1
        print("Using the most recent images found:")
        for p in sources:
            print("  " + str(p))
        print()

    OUT.mkdir(parents=True, exist_ok=True)
    for i, src in enumerate(sources, 1):
        out = OUT / f"screenshot-{i}-1280x800.png"
        img = convert(src, crop)
        assert img.size == TARGET and img.mode == "RGB"
        img.save(out)
        print(f"store/assets/{out.name}  <-  {src.name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
