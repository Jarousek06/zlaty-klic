// WEBER – Klíčová služba — minimalistická verze: 3D klíč, živá otevírací doba, menu, mapa, galerie
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const body = document.body;

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const lowPower = !finePointer || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;

$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
setTimeout(() => $(".intro")?.remove(), 1400); // úvod se schová sám přes CSS, pak ho odstraníme

function webglOK() {
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch { return false; }
}

/* ============================================================
   1) Stříbrný 3D klíč
   ============================================================ */
const heroCanvas = $(".hero__gl");
function showFallback() {
  const img = $(".hero__fallback");
  img.src = img.dataset.src;
  img.hidden = false;
  heroCanvas.remove();
}
if (!webglOK()) showFallback();
else {
  import("./hero3d.js")
    .then((m) => { if (!m.initHero(heroCanvas, { reduced, lowPower, intro: false, neutral: true })) showFallback(); })
    .catch(showFallback);
}

/* ============================================================
   2) Otevírací doba — živý stav (stejná data jsou v HTML tabulce a JSON-LD)
   ============================================================ */
const WEEKDAY = [[480, 720], [780, 960]];
const HOURS = [[], WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, WEEKDAY, [[540, 660]]]; // 0 = neděle, minuty od půlnoci
const DAY_NAMES = ["v neděli", "v pondělí", "v úterý", "ve středu", "ve čtvrtek", "v pátek", "v sobotu"];
const hm = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

function pragueNow() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Prague", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  return { day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")), min: +get("hour") * 60 + +get("minute") };
}
function nextOpening(day, min) {
  for (let i = 0; i < 8; i++) {
    const d = (day + i) % 7;
    const slot = HOURS[d].find(([o]) => i > 0 || o > min);
    if (slot) return `${i === 0 ? "" : i === 1 ? "zítra " : DAY_NAMES[d] + " "}v ${hm(slot[0])}`;
  }
  return "";
}
function updateStatus() {
  const { day, min } = pragueNow();
  const today = HOURS[day];
  const open = today.find(([o, c]) => min >= o && min < c);
  let cls, html;
  if (open) { cls = "is-open"; html = `<strong>Otevřeno</strong> · zavíráme v ${hm(open[1])}`; }
  else if (today.length > 1 && min >= today[0][1] && min < today[1][0]) { cls = "is-pause"; html = `<strong>Polední pauza</strong> · otevíráme v ${hm(today[1][0])}`; }
  else { cls = "is-closed"; html = `<strong>Zavřeno</strong> · otevíráme ${nextOpening(day, min)}`; }
  $$("[data-status]").forEach((el) => {
    el.classList.remove("is-open", "is-pause", "is-closed");
    el.classList.add(cls);
    $(".status__text", el).innerHTML = html;
  });
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", +tr.dataset.day === day));
}
updateStatus();
setInterval(updateStatus, 60_000);

/* ============================================================
   3) Hlavička + mobilní menu
   ============================================================ */
const nav = $(".nav");
const burger = $(".burger");
const menu = $("#menu");
let lastToggle = 0;

function setMenu(open) {
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Zavřít menu" : "Otevřít menu");
  body.classList.toggle("is-locked", open);
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add("is-open")));
  } else {
    menu.classList.remove("is-open");
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 220);
  }
}
burger.addEventListener("click", () => {
  // dotyk může na některých zařízeních vyvolat dvojí aktivaci → menu by se hned zavřelo
  if (performance.now() - lastToggle < 450) return;
  lastToggle = performance.now();
  setMenu(burger.getAttribute("aria-expanded") !== "true");
});
menu.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && burger.getAttribute("aria-expanded") === "true") { setMenu(false); burger.focus(); } });
addEventListener("resize", () => { if (innerWidth > 1024 && !menu.hidden) setMenu(false); });

addEventListener("scroll", () => nav.classList.toggle("is-scrolled", scrollY > 8), { passive: true });

const navLinks = $$(".nav__links a");
const spy = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (en.isIntersecting) navLinks.forEach((a) => a.classList.toggle("is-active", a.hash === "#" + en.target.id));
  });
}, { rootMargin: "-40% 0px -55% 0px" });
["sluzby", "nabidka", "o-nas", "galerie", "kontakt"].forEach((id) => spy.observe(document.getElementById(id)));

/* ============================================================
   4) Jemné odhalení + počítadla
   ============================================================ */
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("is-in");
    io.unobserve(en.target);
  });
}, { rootMargin: "0px 0px -6% 0px", threshold: 0.05 });
$$("[data-reveal]").forEach((el) => io.observe(el));

const countIO = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    countIO.unobserve(en.target);
    if (reduced) return;
    const el = en.target, end = +el.dataset.count, t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / 900);
      el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}, { threshold: 0.6 });
$$("[data-count]").forEach((el) => countIO.observe(el));

/* ============================================================
   5) Mapa — Google se načte až po kliknutí
   ============================================================ */
(() => {
  const map = $(".map");
  if (!map) return;
  $(".map__load", map).addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.title = "Mapa: WEBER – Klíčová služba, Dlouhá 756, Štětí";
    f.referrerPolicy = "no-referrer-when-downgrade";
    f.src = map.dataset.mapSrc;
    map.appendChild(f);
    map.classList.add("is-live");
    f.focus();
  });
})();

/* ============================================================
   6) Galerie — šipky, klávesnice, tažení myší
   ============================================================ */
(() => {
  const strip = $(".strip");
  const [prev, next] = $$(".gallery__nav .round");
  const update = () => {
    prev.disabled = strip.scrollLeft < 8;
    next.disabled = strip.scrollLeft > strip.scrollWidth - strip.clientWidth - 8;
  };
  const stepBy = (dir) => strip.scrollBy({ left: dir * ($(".shot", strip).clientWidth + 16), behavior: reduced ? "auto" : "smooth" });
  prev.addEventListener("click", () => stepBy(-1));
  next.addEventListener("click", () => stepBy(1));
  strip.addEventListener("scroll", update, { passive: true });
  strip.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); stepBy(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); stepBy(-1); }
  });
  let down = false, sx = 0, sl = 0;
  strip.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") { down = true; sx = e.clientX; sl = strip.scrollLeft; } });
  addEventListener("pointermove", (e) => {
    if (!down) return;
    if (Math.abs(e.clientX - sx) > 4) strip.classList.add("is-drag");
    strip.scrollLeft = sl - (e.clientX - sx);
  });
  addEventListener("pointerup", () => { down = false; strip.classList.remove("is-drag"); });
  strip.addEventListener("dragstart", (e) => e.preventDefault());
  update();
})();
