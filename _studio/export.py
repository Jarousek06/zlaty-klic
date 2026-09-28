# Převod renderů ze studia (_studio/raw/*.png) na WebP do assets/img.
# Přidá jemnou filmovou úpravu: teplejší stíny, vinětace. Použití: python zlaty-klic/_studio/export.py
import pathlib

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "_studio" / "raw"
OUT = ROOT / "assets" / "img"


def vignette(size, strength=0.55):
    w, h = size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.ellipse((-w * 0.25, -h * 0.2, w * 1.25, h * 1.2), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    return mask.point(lambda v: int(255 * (1 - strength) + v * strength))


for png in sorted(RAW.glob("*.png")):
    if png.stem.startswith("logo"):
        # logo: zachovat průhlednost, bez vinětace, oříznout na obsah
        logo = Image.open(png).convert("RGBA")
        logo = logo.resize((logo.width // 2, logo.height // 2), Image.LANCZOS)
        bbox = logo.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        if bbox:
            pad = 12
            logo = logo.crop((max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(logo.width, bbox[2] + pad), min(logo.height, bbox[3] + pad)))
        if logo.width > 900:  # v navigaci má logo ~46 px na výšku; 900 px stačí i pro retina a patičku
            logo = logo.resize((900, round(logo.height * 900 / logo.width)), Image.LANCZOS)
        target = OUT / (png.stem + ".webp")
        logo.save(target, "WEBP", quality=92, method=6)
        print(f"{png.name} -> {target.name}  {target.stat().st_size // 1024} kB  {logo.size[0]}x{logo.size[1]} (alfa)")
        continue
    img = Image.open(png).convert("RGB")
    img = img.resize((img.width // 2, img.height // 2), Image.LANCZOS)  # studio renderuje 2×
    dark = Image.new("RGB", img.size, (3, 3, 3))
    img = Image.composite(img, dark, vignette(img.size))
    # teplý nádech ve stínech
    warm = Image.new("RGB", img.size, (14, 9, 3))
    img = ImageChops.add(img, warm)
    target = OUT / (png.stem + ".webp")
    img.save(target, "WEBP", quality=84, method=6)
    print(f"{png.name} -> {target.name}  {target.stat().st_size // 1024} kB  {img.size[0]}x{img.size[1]}")
