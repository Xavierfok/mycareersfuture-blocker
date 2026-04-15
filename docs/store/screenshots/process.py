"""resize + pad screenshots to exact chrome web store spec (1280x800, 24-bit, no alpha)."""
from pathlib import Path
from PIL import Image

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent / "final"
OUT.mkdir(exist_ok=True)
TARGET = (1280, 800)
BG = (245, 246, 248)  # light neutral gray, matches mycareersfuture bg feel

def on_canvas(img: Image.Image) -> Image.Image:
    """place image on a 1280x800 canvas, preserving aspect, centered."""
    img = img.convert("RGB")
    iw, ih = img.size
    tw, th = TARGET
    # scale so largest dimension fits within canvas with some margin
    margin = 0.96
    scale = min((tw * margin) / iw, (th * margin) / ih)
    new_size = (int(iw * scale), int(ih * scale))
    scaled = img.resize(new_size, Image.LANCZOS)
    canvas = Image.new("RGB", TARGET, BG)
    x = (tw - new_size[0]) // 2
    y = (th - new_size[1]) // 2
    canvas.paste(scaled, (x, y))
    return canvas

def fit_width_crop_top(img: Image.Image) -> Image.Image:
    """for tall listing captures: fit width to 1280, crop top 800."""
    img = img.convert("RGB")
    iw, ih = img.size
    tw, th = TARGET
    scale = tw / iw
    new_size = (tw, int(ih * scale))
    scaled = img.resize(new_size, Image.LANCZOS)
    if new_size[1] >= th:
        return scaled.crop((0, 0, tw, th))
    canvas = Image.new("RGB", TARGET, BG)
    canvas.paste(scaled, (0, 0))
    return canvas

# 1, 2: tall listing captures, crop to the top 800 so block buttons stay visible
for name in ["01-listing-hero.png", "02-listing-more.png"]:
    img = Image.open(RAW / name)
    out = fit_width_crop_top(img)
    out.save(OUT / name, format="PNG", optimize=True)
    print(f"wrote {OUT / name} {out.size} {out.mode}")

# 3: detail page is close to target, just pad/scale to fit
for name in ["03-detail-page.png"]:
    img = Image.open(RAW / name)
    out = on_canvas(img)
    out.save(OUT / name, format="PNG", optimize=True)
    print(f"wrote {OUT / name} {out.size} {out.mode}")

# 4: popup is small, place on canvas with context (scale up a bit)
for name in ["04-popup.png"]:
    img = Image.open(RAW / name).convert("RGB")
    # scale the popup to be a prominent element, ~600 px wide
    target_w = 600
    iw, ih = img.size
    scale = target_w / iw
    scaled = img.resize((target_w, int(ih * scale)), Image.LANCZOS)
    canvas = Image.new("RGB", TARGET, BG)
    x = (TARGET[0] - scaled.size[0]) // 2
    y = (TARGET[1] - scaled.size[1]) // 2
    canvas.paste(scaled, (x, y))
    canvas.save(OUT / name, format="PNG", optimize=True)
    print(f"wrote {OUT / name} {canvas.size} {canvas.mode}")

print("\nall 4 screenshots processed to 1280x800 RGB (no alpha).")
