# Build pro Netlify: zkopíruje jen soubory, které web opravdu načítá, do zlaty-klic/dist/,
# přidá 404.html, _headers a robots.txt a vytvoří weber-web.zip (soubory v kořeni ZIPu → Netlify Drop).
# Použití: python zlaty-klic/_studio/build.py
import pathlib
import re
import shutil
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"
ZIP = ROOT.parent / "weber-web.zip"

FILES = [
    "index.html",
    "assets/css/style.css",
    "assets/js/main.js",
    "assets/js/hero3d.js",
    "assets/js/models.js",
    "assets/js/doorkey.js",
    "assets/vendor/three.module.min.js",
    "assets/vendor/three-LICENSE.txt",
    "assets/vendor/FontLoader.js",      # importuje models.js (logo builder), za běhu se font nenačítá
    "assets/vendor/TextGeometry.js",
    "assets/vendor/jsm/loaders/FBXLoader.js",
    "assets/vendor/jsm/libs/fflate.module.js",
    "assets/vendor/jsm/curves/NURBSCurve.js",
    "assets/vendor/jsm/curves/NURBSUtils.js",
    "assets/models/door-key/Key.fbx",
    "assets/models/door-key/Key_BaseColor.webp",
    "assets/models/door-key/Key_Normal.webp",
    "assets/models/door-key/Key_Roughness.webp",
    "assets/models/door-key/Key_Metallic.webp",
    "assets/img/favicon.svg",
    "assets/img/logo-weber.webp",
    "assets/img/klic-hero.webp",        # záloha, když prohlížeč neumí WebGL
    "assets/img/svc-klice.webp",
    "assets/img/svc-autoklice.webp",
    "assets/img/svc-zamecnictvi.webp",
    "assets/img/svc-bezpecnost.webp",
    "assets/img/pribeh.webp",
    "assets/img/gal-hlava.webp",
    "assets/img/gal-zuby.webp",
    "assets/img/gal-vlozka.webp",
    "assets/img/gal-zamek.webp",
    "assets/img/gal-freza.webp",
]

NOT_FOUND = """<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stránka nenalezena | WEBER – Klíčová služba Štětí</title>
<meta name="robots" content="noindex">
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/css/style.css">
<style>.nf{min-height:100vh;display:grid;place-content:center;justify-items:start;gap:18px;padding:32px var(--gutter);max-width:640px;margin:0 auto}.nf h1{font-size:clamp(2.2rem,6vw,3.4rem)}.nf p{color:var(--muted)}.nf div{display:flex;flex-wrap:wrap;gap:12px}</style>
</head>
<body>
<main class="nf">
  <p class="eyebrow">Chyba 404</p>
  <h1>Tahle stránka neexistuje.</h1>
  <p>Klíč k ní nemáme — ale ke všemu ostatnímu ano.</p>
  <div>
    <a class="btn btn--dark btn--lg" href="/">Zpět na úvod</a>
    <a class="btn btn--light btn--lg" href="tel:+420736680536">Zavolat 736 680 536</a>
  </div>
</main>
</body>
</html>
"""

HEADERS = """/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: SAMEORIGIN
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/
  Cache-Control: public, max-age=0, must-revalidate

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=604800
"""

ROBOTS = "User-agent: *\nAllow: /\n"


def main():
    missing = [f for f in FILES if not (ROOT / f).is_file()]
    if missing:
        sys.exit("CHYBÍ soubory: " + ", ".join(missing))

    # kontrola: každý lokální odkaz v HTML/CSS/JS musí být v seznamu
    listed = set(FILES)
    refs = set()
    for f in ["index.html", "assets/css/style.css", "assets/js/main.js", "assets/js/hero3d.js", "assets/js/doorkey.js"]:
        text = (ROOT / f).read_text(encoding="utf-8")
        refs |= set(re.findall(r"assets/[\w./-]+\.(?:webp|svg|css|js|fbx|txt)", text))
    doorkey = (ROOT / "assets/js/doorkey.js").read_text(encoding="utf-8")
    refs |= {"assets/models/door-key/" + n for n in re.findall(r'"(Key[\w_]*\.(?:fbx|webp))"', doorkey)}
    unlisted = sorted(r for r in refs if r not in listed and not r.startswith("assets/img/klic-") and "vendor/fonts" not in r)
    if unlisted:
        sys.exit("Odkazované soubory nejsou v buildu: " + ", ".join(unlisted))

    if DIST.exists():
        shutil.rmtree(DIST)
    for f in FILES:
        target = DIST / f
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / f, target)
    (DIST / "404.html").write_text(NOT_FOUND, encoding="utf-8")
    (DIST / "_headers").write_text(HEADERS, encoding="utf-8")
    (DIST / "robots.txt").write_text(ROBOTS, encoding="utf-8")

    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for p in sorted(DIST.rglob("*")):
            if p.is_file():
                z.write(p, p.relative_to(DIST).as_posix())
    with zipfile.ZipFile(ZIP) as z:
        names = z.namelist()
    total = sum(p.stat().st_size for p in DIST.rglob("*") if p.is_file())
    print(f"dist/: {len(names)} souborů, {total // 1024} kB → {ZIP.name} {ZIP.stat().st_size // 1024} kB")
    for n in names:
        print("  " + n)


if __name__ == "__main__":
    main()
