// Sdílené 3D modely a materiály — používá je hero, sekce Preciznost i studio pro rendery.
import * as THREE from "three";

/* ---------- Studiové prostředí: černo s teplými softboxy (odrazy v kovu) ---------- */
// neutral: všechny panely bílé (stříbrný web) — stejné rozmístění světel, bez teplého zlatého nádechu
export function studioEnvironment(renderer, { warmth = 1, neutral = false } = {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const panel = (w, h, hex, intensity, pos, target = [0, 0, 0]) => {
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(neutral ? 0xffffff : hex).multiplyScalar(intensity), side: THREE.DoubleSide });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    m.position.set(...pos);
    m.lookAt(...target);
    scene.add(m);
  };
  panel(9, 2.6, 0xfff0d2, 3.2, [0, 7, 3]);               // horní softbox
  panel(1.1, 11, 0xffc46a, 2.4 * warmth, [-7.5, 0, 2]);   // levý teplý pruh
  panel(0.9, 11, 0xffdca0, 5.5, [6.5, 1.5, -4]);          // kontra zezadu vpravo
  panel(14, 1.6, 0x8a5a1e, 0.7 * warmth, [0, -6.5, 2]);   // teplý odraz od stolu
  panel(2.6, 2.6, 0xfff6e8, 1.4, [3.5, 2.5, 8]);          // přední výplň
  panel(0.5, 6, 0xffb347, 3 * warmth, [-3, 5, -6]);       // zlatý zábřesk zezadu
  // široká přední výplň s přechodem — ploché plochy kovu pak chytají zlatý gradient místo černé
  panel(18, 4, 0xffe0aa, 0.75, [0, 4.5, 12]);
  panel(18, 4, 0xc98a3a, 0.32 * warmth, [0, 0.5, 13]);
  panel(18, 4, 0x5a3a14, 0.12, [0, -3.5, 12]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.035).texture;
  pmrem.dispose();
  scene.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  return tex;
}

/* ---------- Materiály ---------- */
function brushedRoughness(size = 512) {
  const c = document.createElement("canvas");
  c.width = size; c.height = 64;
  const g = c.getContext("2d");
  g.fillStyle = "#9a9a9a"; g.fillRect(0, 0, size, 64);
  for (let i = 0; i < 900; i++) {
    const v = 120 + Math.random() * 90 | 0;
    g.fillStyle = `rgba(${v},${v},${v},.35)`;
    g.fillRect(Math.random() * size, Math.random() * 64, 20 + Math.random() * 160, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

let roughTex = null;
export function goldMaterial({ roughness = 0.26 } = {}) {
  roughTex ||= brushedRoughness();
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#E2AC4E"),
    metalness: 1,
    roughness,
    roughnessMap: roughTex,
    clearcoat: 0.25,
    clearcoatRoughness: 0.18,
    envMapIntensity: 1.15,
  });
}

export function steelMaterial({ color = "#B9BDC2", roughness = 0.32 } = {}) {
  roughTex ||= brushedRoughness();
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color(color), metalness: 1, roughness, roughnessMap: roughTex, envMapIntensity: 1 });
}

export function blackGlossMaterial() {
  return new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#0b0b0c"), metalness: 0.2, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.08 });
}

/* ---------- Pomocné tvary ---------- */
const cylX = (r, len, x, mat, seg = 64) => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.x = x;
  return m;
};
const ringX = (R, tube, x, mat) => {
  const g = new THREE.TorusGeometry(R, tube, 24, 96);
  g.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(g, mat);
  m.position.x = x;
  return m;
};
const circlePath = (x, y, r) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, Math.PI * 2, true); return p; };

/* ---------- Ornamentální zlatý klíč (hero) ---------- */
export function buildOrnateKey(mat) {
  const key = new THREE.Group();

  // hlava: čtyřlístek s otvory
  const bow = new THREE.Shape();
  const N = 240;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    const r = 0.98 + 0.1 * Math.cos(4 * a);
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? bow.lineTo(x, y) : bow.moveTo(x, y);
  }
  bow.holes.push(circlePath(0, 0, 0.3));
  for (let k = 0; k < 4; k++) {
    const a = Math.PI / 4 + (k * Math.PI) / 2;
    bow.holes.push(circlePath(Math.cos(a) * 0.64, Math.sin(a) * 0.64, 0.12));
    const b = (k * Math.PI) / 2;
    if (k !== 0) bow.holes.push(circlePath(Math.cos(b) * 0.68, Math.sin(b) * 0.68, 0.07));
  }
  const bowGeo = new THREE.ExtrudeGeometry(bow, { depth: 0.18, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6, curveSegments: 64 });
  bowGeo.translate(0, 0, -0.09);
  key.add(new THREE.Mesh(bowGeo, mat));

  // reliéfní prstence na obou stranách hlavy
  for (const z of [0.15, -0.15]) {
    const r1 = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.028, 16, 120), mat); r1.position.z = z; key.add(r1);
    const r2 = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.038, 16, 96), mat); r2.position.z = z; key.add(r2);
  }

  // krček
  key.add(cylX(0.21, 0.14, 1.0, mat));
  key.add(ringX(0.17, 0.05, 1.15, mat));
  key.add(cylX(0.15, 0.18, 1.29, mat));
  key.add(ringX(0.15, 0.045, 1.42, mat));

  // dřík
  key.add(cylX(0.12, 3.3, 3.05, mat));
  key.add(ringX(0.125, 0.034, 2.3, mat));
  key.add(ringX(0.125, 0.034, 3.62, mat));
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.125, 48, 32), mat);
  tip.scale.set(0.7, 1, 1); tip.position.x = 4.7;
  key.add(tip);

  // zub (bit)
  const bit = new THREE.Shape();
  [[3.78, 0.02], [4.55, 0.02], [4.55, -0.9], [4.41, -0.9], [4.41, -0.64], [4.29, -0.64], [4.29, -0.9],
   [4.08, -0.9], [4.08, -0.74], [3.95, -0.74], [3.95, -0.9], [3.78, -0.9]].forEach(([x, y], i) => (i ? bit.lineTo(x, y) : bit.moveTo(x, y)));
  bit.holes.push(circlePath(4.17, -0.36, 0.08));
  const bitGeo = new THREE.ExtrudeGeometry(bit, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.022, bevelSegments: 4 });
  bitGeo.translate(0, 0, -0.05);
  key.add(new THREE.Mesh(bitGeo, mat));

  key.position.x = -1.85; // střed klíče do počátku
  const wrap = new THREE.Group();
  wrap.add(key);
  return wrap;
}

import { FontLoader } from "../vendor/FontLoader.js";
import { TextGeometry } from "../vendor/TextGeometry.js";

let fontPromise = null;
const loadFont = () =>
  (fontPromise ||= new FontLoader().loadAsync(new URL("../vendor/fonts/helvetiker_bold.typeface.json", import.meta.url).href));

/* ---------- Logo WEBER podle předlohy klienta (obrázek zlatého klíče) ----------
   Souřadnice v pixelech předlohy (1983×793, y dolů) × 0,01. Pohled zepředu:
   spodní deska má tmavé čelo (prosvítá ve vyrytých místech), horní deska se zkosenými
   hranami nese hlavu a lištu čepele; vyrytí (otvor, drážka, MR, dělicí čára) jsou otvory
   v horní desce, písmena WEBER jsou samostatné vystouplé díly se špičatými zuby. */
function hammeredBump(size = 1024) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  g.fillStyle = "#808080"; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const v = (100 + Math.random() * 60) | 0;
    g.fillStyle = `rgba(${v},${v},${v},.18)`;
    g.beginPath(); g.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 9, 0, Math.PI * 2); g.fill();
  }
  for (let i = 0; i < 700; i++) {
    const v = Math.random() < 0.5 ? 90 : 170;
    g.fillStyle = `rgba(${v},${v},${v},.25)`;
    g.fillRect(Math.random() * size, Math.random() * size, 30 + Math.random() * 220, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(0.35, 0.35);
  return t;
}

export async function buildWeberLogo() {
  const font = await loadFont();
  const S = 0.01;
  const v2 = (arr) => arr.map(([x, y]) => new THREE.Vector2(x * S, -y * S));
  const shapeOf = (arr, holes = []) => { const s = new THREE.Shape(v2(arr)); holes.forEach((h) => s.holes.push(new THREE.Path(v2(h)))); return s; };
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const circle = (cx, cy, r, n = 96) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const quad = (p0, c, p1, n = 14) => Array.from({ length: n }, (_, i) => { const t = (i + 1) / n, u = 1 - t; return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]]; });
  const arc = (cx, cy, r, a0, a1, n = 140) => Array.from({ length: n + 1 }, (_, i) => { const a = THREE.MathUtils.degToRad(a0 + ((a1 - a0) * i) / n); return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });

  const gold = goldMaterial({ roughness: 0.24 });
  gold.color.set("#F2CC6B"); // žluté zlato; logo se renderuje s Neutral tone mappingem, který odstín nedeformuje
  gold.roughness = 0.2;
  gold.bumpMap = hammeredBump();
  gold.bumpScale = 2.2;
  const engrave = new THREE.MeshPhysicalMaterial({ color: new THREE.Color("#120b02"), metalness: 0.5, roughness: 0.6 });

  const logo = new THREE.Group();
  const neck = [[660, 192], ...quad([660, 192], [705, 270], [800, 270])];
  const bowBack = [...quad([715, 460], [704, 492], [660, 508]), ...arc(435, 350, 275, 35, 325)];

  // spodní deska: tmavé čelo, zlaté boky
  const base = shapeOf([...neck, [1760, 270], [1858, 356], [1768, 446], [1768, 460], [715, 460], ...bowBack], [circle(275, 360, 62)]);
  const baseGeo = new THREE.ExtrudeGeometry(base, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3, curveSegments: 32 });
  baseGeo.translate(0, 0, -0.12);
  logo.add(new THREE.Mesh(baseGeo, [engrave, gold]));

  // horní deska s vyrytím
  // hlubší zkosení → vyrytí má světlou hranu i při pohledu zepředu; čelo horní desky je v z = 0,2
  const TOP = { depth: 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.035, bevelSegments: 6, curveSegments: 32 };
  const topShape = shapeOf(
    [...neck, [1760, 270], [1858, 356], [1768, 446], [1768, 352], [715, 352], [715, 460], ...bowBack],
    [
      circle(275, 360, 78),                                                     // otvor na kroužek
      [[730, 318], [790, 300], [1745, 300], [1800, 316], [1745, 332], [790, 332]], // drážka čepele
      rect(684, 236, 702, 466),                                                 // dělicí čára
      [[365, 222], [398, 222], [462, 292], [527, 222], [560, 222], [560, 395], [533, 395], [533, 276], [462, 350], [392, 276], [392, 395], [365, 395]], // M (pravý dřík je zároveň dřík R)
      [[566, 222], [616, 222], [652, 252], [652, 290], [616, 320], [566, 320], [566, 292], [606, 292], [622, 280], [622, 262], [606, 250], [566, 250]], // R — oblouk
      [[590, 326], [622, 326], [662, 395], [630, 395]],                         // R — nožka
    ]
  );
  const topGeo = new THREE.ExtrudeGeometry(topShape, TOP);
  topGeo.translate(0, 0, 0.05);
  logo.add(new THREE.Mesh(topGeo, gold));

  // kroužek kolem otvoru
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.09, 24, 96), gold);
  ring.position.set(2.75, -3.6, 0.1);
  logo.add(ring);

  // WEBER — vystouplá písmena se zuby
  // tvary písmen v základní šířce (W 296 px, ostatní 145 px), roztažené tak, aby mezery byly jen úzké
  // vyryté spáry (18 px) jako na předloze, ne tmavé pole
  const place = (x0, w, base, pts) => pts.map(([x, y]) => [x0 + (x * w) / base, y]);
  const W = [[0, 362], [58, 362], [104, 462], [126, 410], [170, 410], [192, 462], [238, 362], [296, 362], [192, 545], [148, 470], [104, 545]];
  const Eo = [[0, 362], [145, 362], [145, 400], [48, 400], [48, 426], [128, 426], [128, 458], [48, 458], [48, 482], [145, 482], [72, 545], [0, 482]];
  const Bo = [[0, 362], [110, 362], [145, 392], [145, 410], [122, 425], [145, 440], [145, 482], [72, 545], [0, 482]];
  const Ro = [[0, 362], [110, 362], [145, 394], [145, 430], [113, 452], [145, 482], [72, 545], [0, 482]];
  const letters = [
    [place(728, 330, 296, W), []],
    [place(1076, 157, 145, Eo), []],
    [place(1251, 157, 145, Bo), [place(1251, 157, 145, rect(48, 398, 100, 416)), place(1251, 157, 145, rect(48, 446, 100, 470))]],
    [place(1426, 157, 145, Eo), []],
    [place(1601, 157, 145, Ro), [place(1601, 157, 145, rect(48, 398, 100, 428))]],
  ];
  for (const [outer, holes] of letters) {
    const g = new THREE.ExtrudeGeometry(shapeOf(outer, holes), TOP);
    g.translate(0, 0, 0.05);
    logo.add(new THREE.Mesh(g, gold));
  }

  // MARTIN / REICH — tmavé vyrytí s prostrkáním
  const spaced = (str, size, cx, cy, track) => {
    const geos = [...str].map((ch) => { const g = new TextGeometry(ch, { font, size, depth: 0.004, curveSegments: 6, bevelEnabled: false }); g.computeBoundingBox(); return g; });
    const widths = geos.map((g) => g.boundingBox.max.x - g.boundingBox.min.x);
    let x = cx * S - (widths.reduce((a, b) => a + b, 0) + track * (str.length - 1)) / 2;
    geos.forEach((g, i) => { g.translate(x - g.boundingBox.min.x, -cy * S - size * 0.36, 0.202); x += widths[i] + track; logo.add(new THREE.Mesh(g, engrave)); });
  };
  spaced("MARTIN", 0.4, 505, 440, 0.12);
  spaced("REICH", 0.4, 505, 484, 0.12);
  for (const cx of [372, 638]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.035, 0.004), engrave);
    line.position.set(cx * S, -484 * S, 0.202);
    logo.add(line);
  }

  // střed loga do počátku
  logo.position.set(-10.09, 3.1, 0);
  const wrap = new THREE.Group();
  wrap.add(logo);
  return wrap;
}

/* ---------- Moderní plochý klíč se zuby (Preciznost, rendery) ---------- */
const CUTS = [0.45, 0.95, 1.45, 1.95, 2.45];
const DEPTHS = [0.12, 0.22, 0.07, 0.19, 0.1];
export const BLADE = { len: 3.2, top: 0.3, base: -0.3 };

export function bladeBottom(u) {
  let d = 0;
  CUTS.forEach((c, i) => { d = Math.max(d, Math.min(DEPTHS[i], DEPTHS[i] - (Math.abs(u - c) - 0.04))); });
  let y = BLADE.base + Math.max(0, d);
  if (u > 2.85) y = Math.max(y, BLADE.base + (u - 2.85) * 0.75);
  return y;
}

export function buildBladeKey(mat, headMat = mat) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  s.moveTo(-0.02, BLADE.top);
  s.lineTo(2.9, BLADE.top);
  s.lineTo(BLADE.len, 0.06);
  for (let u = BLADE.len; u >= -0.02; u -= 0.01) s.lineTo(u, bladeBottom(Math.max(0, u)));
  s.lineTo(-0.02, BLADE.base);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.1, bevelEnabled: true, bevelThickness: 0.018, bevelSize: 0.012, bevelSegments: 3, curveSegments: 12 });
  geo.translate(0, 0, -0.05);
  g.add(new THREE.Mesh(geo, mat));

  // frézovaná drážka
  const groove = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.05, 0.02), steelMaterial({ color: "#6d5a33", roughness: 0.5 }));
  groove.position.set(1.4, 0.12, 0.068);
  g.add(groove);

  // hlava s otvorem
  const head = new THREE.Shape();
  const hw = 1.25, hh = 1.1, r = 0.34, x0 = -hw - 0.05, y0 = -hh / 2;
  head.moveTo(x0 + r, y0);
  head.lineTo(x0 + hw - r, y0); head.quadraticCurveTo(x0 + hw, y0, x0 + hw, y0 + r);
  head.lineTo(x0 + hw, y0 + hh - r); head.quadraticCurveTo(x0 + hw, y0 + hh, x0 + hw - r, y0 + hh);
  head.lineTo(x0 + r, y0 + hh); head.quadraticCurveTo(x0, y0 + hh, x0, y0 + hh - r);
  head.lineTo(x0, y0 + r); head.quadraticCurveTo(x0, y0, x0 + r, y0);
  head.holes.push(circlePath(x0 + 0.34, 0, 0.15));
  const headGeo = new THREE.ExtrudeGeometry(head, { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 5, curveSegments: 32 });
  headGeo.translate(0, 0, -0.08);
  g.add(new THREE.Mesh(headGeo, headMat));
  return g;
}

/* ---------- Fréza ---------- */
export function buildCutter(mat, { R = 0.78, teeth = 56 } = {}) {
  const g = new THREE.Group();
  const s = new THREE.Shape();
  for (let i = 0; i <= teeth * 2; i++) {
    const a = (i / (teeth * 2)) * Math.PI * 2;
    const r = i % 2 ? R - 0.05 : R;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    i ? s.lineTo(x, y) : s.moveTo(x, y);
  }
  s.holes.push(circlePath(0, 0, 0.09));
  const disc = new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.008, bevelSegments: 2 });
  disc.translate(0, 0, -0.025);
  const wheel = new THREE.Mesh(disc, mat);
  g.add(wheel);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.2, 48), mat);
  hub.rotation.x = Math.PI / 2; hub.position.z = -0.12;
  g.add(hub);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 32), steelMaterial({ color: "#8d9095", roughness: 0.4 }));
  shaft.rotation.x = Math.PI / 2; shaft.position.z = -1.6;
  g.add(shaft);
  g.userData.wheel = wheel;
  return g;
}

/* ---------- Jiskry ---------- */
export function sparkSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.25, "rgba(255,220,150,.9)");
  grd.addColorStop(1, "rgba(255,160,40,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
export const clamp01 = (t) => Math.max(0, Math.min(1, t));
