# WEBER – Klíčová služba (Martin Reich) — web

Prémiový „cinematic“ web pro zámečnictví ve Štětí. Pracovní složka se jmenuje `zlaty-klic/`
(původní název konceptu), značka na webu je **WEBER – Klíčová služba**.

Statický web bez buildu. Náhled: konfigurace `zlaty-klic` v `.claude/launch.json`
(`python zlaty-klic/_studio/server.py 5188`) → http://localhost:5188

## Nasazení na Netlify
1. `python zlaty-klic/_studio/build.py` → `zlaty-klic/dist/` + `weber-web.zip` v kořeni OneDrive složky
   (jen soubory, které web načítá; skript zkontroluje, že žádný odkazovaný soubor nechybí).
2. app.netlify.com/drop → přetáhnout **složku `dist/`** nebo rozbalený ZIP.
3. Po připojení domény doplnit do `index.html` absolutní `og:url` a `og:image`.
Build přidává `404.html`, `_headers` (cache HTML 0 s, assets 7 dní, bezpečnostní hlavičky) a `robots.txt`.
Zkušební server nad `dist/`: launch.json `weber-dist` → http://localhost:5197.
Upravuje se vždy zdroj v `zlaty-klic/`, `dist/` se přegeneruje.

## Údaje o firmě (zdroje ověřeny 15. 9. 2026)
- **WEBER – Klíčová služba**, provozovatel Martin Reich (fyzická osoba podnikající)
- Dlouhá 756, 411 08 Štětí · GPS 50.455320, 14.372596
- Tel. 736 680 536, firemní 728 131 866 · webert@seznam.cz
- IČO 03073157 · DIČ CZ8001112702 · vznik 4. 6. 2014 (ARES)
- Otevírací doba: Po–Pá 8:00–12:00, 13:00–16:00 · So 9:00–11:00 · Ne zavřeno
  (Živé firmy uvádějí Po–Pá 8–16 bez pauzy; použita podrobnější verze z Firmy.cz — nechat potvrdit)
- Google: 4,5 / 5 z 56 recenzí · Živé firmy: ocenění „Spolehlivá firma“

Zdroje: zivefirmy.cz/weber---klicova-sluzba---martin-reich_f1346166, ARES, Firmy.cz.
Starý web weber-klicova-sluzba-martin-reich.business.site už neexistuje (Google Business Sites zrušeny).

## Logo
Předloha: obrázek od klienta (zlatý plochý klíč — MR monogram, MARTIN — REICH, drážka v čepeli,
písmena WEBER jako zuby se špičkami). V hero zůstává ornamentální 3D klíč; logo je jen nahoře a v patičce.
- Model: `buildWeberLogo()` v `assets/js/models.js` — vrstvené desky, vyrytí jsou skutečně zapuštěná se zkosením,
  souřadnice odpovídají pixelům předlohy × 0,01.
- Render: studio scéna `logo-weber` (`_studio/?save=logo-weber`, pak `export.py`) → `assets/img/logo-weber.webp`
  (900 px, průhledné pozadí). Používá vlastní osvětlení a Neutral tone mapping — s ACES a běžným studiem
  vycházelo zlato měděné a ploché.
- Favicon: `assets/img/favicon.svg` (hlava klíče s MR).

## 3D klíč v hero
Model „Door Key“ od GUIBEL — sketchfab.com/3d-models/door-key-6538a6a21f5545e0b1dcf22bee5741a1,
licence **CC BY 4.0 → uvedení autora v patičce je povinné, nemazat**. Klient ho stáhl (door-key.zip).
- `assets/models/door-key/` — Key.fbx + PBR textury zmenšené do WebP (originály PNG v `_studio/door-key/`)
- `assets/js/doorkey.js` — načtení (FBXLoader z `assets/vendor/jsm/`), normalizace orientace a velikosti
- test: `_studio/doorkey.html`. Když se model nenačte, hero ukáže ornamentální klíč z `models.js`.

## Stock fotky (Unsplash License — zdarma i komerčně, bez povinného uvedení autora)
Originály v `_studio/stock/<id>.jpg`, na web ořezané do WebP. **Pozor:** `_studio/export.py` by tyto soubory
přepsal rendery ze studia — před spuštěním exportu odstranit příslušná PNG z `_studio/raw/`.
| soubor | Unsplash |
|---|---|
| svc-klice.webp | unsplash.com/photos/Jy60hQjoFbc |
| svc-autoklice.webp | unsplash.com/photos/7mgR-BZ5Dm4 |
| svc-zamecnictvi.webp | unsplash.com/photos/XsJaBZtwhp4 |
| svc-bezpecnost.webp | unsplash.com/photos/3wPJxh-piRw (trezorové dveře; dřív visací zámek 0abEoDwUU-8) |
| pribeh.webp | unsplash.com/photos/motKc68loWM |
| gal-hlava.webp | unsplash.com/photos/PH2Q1aqOARo |
| gal-zuby.webp | unsplash.com/photos/Nel8STCcWy8 |
| gal-vlozka.webp | unsplash.com/photos/V1kic7orldQ |
| gal-zamek.webp | unsplash.com/photos/DcpblPZ6fDA |
| gal-freza.webp | unsplash.com/photos/CY_e5kPUS4w |

## Mapa
Google mapa se načte až po kliknutí na „Zobrazit mapu“ (jinak přebírá scroll a zamrzá vlastní kurzor).

## Otevírací doba je na webu na 2 místech
`index.html` — sekce kontakt a JSON-LD (`openingHoursSpecification`). Při změně upravit obojí.

## Struktura
- `index.html`, `assets/css/style.css`, `assets/js/main.js` — stránka, choreografie, scroll, kurzor
- `assets/js/hero3d.js` — WebGL zlatý klíč v hero (Three.js)
- `assets/js/precision3d.js` — živá scéna frézy v sekci Preciznost
- `assets/js/models.js` — sdílené 3D modely, materiály a studiové světlo
- `assets/vendor/` — Three.js r170 (MIT) + OBJLoader
- `assets/img/` — obrázky vyrenderované ze studia (WebP)
- `_studio/` — **jen pro vývoj, nenasazovat**

## Rendery obrázků
1. `http://localhost:5188/_studio/?view=svc-klice` — náhled
2. `http://localhost:5188/_studio/?save=all` — PNG do `_studio/raw/`
3. `python zlaty-klic/_studio/export.py` — WebP do `assets/img/`

Reálné fotky z provozovny lze nahrát pod stejnými názvy; pak smazat popisek „Ilustrační vizualizace“ v galerii.

## Ještě ověřit s klientem
- [ ] Polední pauza 12–13 (zdroje se liší)
- [ ] Souhlas s uvedením recenzí (jména zkrácena)
- [ ] Sociální sítě — žádné nenalezeny, proto v patičce nejsou
- [ ] Fotky provozovny a výrobků
- [ ] Doména → doplnit `og:url`, `og:image`
