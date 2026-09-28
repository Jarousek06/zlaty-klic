// Studio: z 3D scén renderuje „produktové fotografie“ pro web (jednotný vizuální jazyk).
import * as THREE from "three";
import {
  studioEnvironment, goldMaterial, steelMaterial, blackGlossMaterial,
  buildOrnateKey, buildBladeKey, buildCutter, bladeBottom, sparkSprite, buildWeberLogo,
} from "../assets/js/models.js";

const log = (s) => (document.getElementById("log").textContent += s + "\n");
const params = new URLSearchParams(location.search);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setPixelRatio(2); // supersampling — export.py zmenší na polovinu
document.body.appendChild(renderer.domElement);
const ENV = studioEnvironment(renderer);
const ENV_WARM = studioEnvironment(renderer, { warmth: 1.5 });

// Logo se snímá přesně zepředu → každá rovná plocha odráží jen směr +z. Proto velký světlý
// teplobílý panel přímo proti čelu (zlaté plochy), bílý softbox nahoře (světlé horní hrany),
// zlaté boční pruhy a tma dole (kontrast spodních hran).
function logoEnvironment() {
  const scene = new THREE.Scene();
  const panel = (w, h, hex, k, pos) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(k), side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(0, 0, 0); scene.add(m);
  };
  // jednolitý přední panel dá plochou „kreslenou“ barvu → světlé místo vlevo nahoře + tlumená teplá výplň okolo,
  // takže přechody a kladívkovaná textura zůstanou vidět
  panel(9, 6, 0xfff3d6, 2.2, [-3, 2.5, 14]);
  panel(30, 14, 0xb07a30, 0.35, [0, -2, 16]);
  panel(14, 3, 0xffffff, 3, [0, 9, 4]);
  panel(2, 14, 0xffd590, 2.5, [-10, 0, 4]);
  panel(2, 14, 0xffc870, 1.4, [10, 0, 3]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  return tex;
}

/* ---------- pomocníci ---------- */
function backdrop(cx = 0.6, cy = 0.4, strength = 1) {
  const c = document.createElement("canvas");
  c.width = c.height = 1024;
  const g = c.getContext("2d");
  g.fillStyle = "#030303"; g.fillRect(0, 0, 1024, 1024);
  const r = g.createRadialGradient(cx * 1024, cy * 1024, 0, cx * 1024, cy * 1024, 560);
  r.addColorStop(0, `rgba(62,41,13,${0.85 * strength})`);
  r.addColorStop(0.4, `rgba(22,15,6,${0.8 * strength})`);
  r.addColorStop(1, "rgba(3,3,3,0)");
  g.fillStyle = r; g.fillRect(0, 0, 1024, 1024);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }));
  m.position.z = -12;
  return m;
}
const shape = (pts) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); return s; };
function roundedRect(w, h, r) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function keyholeShape(k = 1) {
  const s = new THREE.Shape();
  s.moveTo(0.09 * k, 0);
  s.absarc(0, 0.12 * k, 0.15 * k, -0.927, Math.PI + 0.927, false);
  s.lineTo(-0.13 * k, -0.38 * k); s.lineTo(0.13 * k, -0.38 * k); s.lineTo(0.09 * k, 0);
  return s;
}
function euroProfile() {
  const s = new THREE.Shape();
  s.moveTo(0.33, -0.3756);
  s.absarc(0, 0, 0.5, -0.85, Math.PI + 0.85, false);
  s.lineTo(-0.33, -1.45); s.quadraticCurveTo(-0.33, -1.62, -0.16, -1.62);
  s.lineTo(0.16, -1.62); s.quadraticCurveTo(0.33, -1.62, 0.33, -1.45); s.lineTo(0.33, -0.3756);
  return s;
}
function lights(scene, { key = [4, 6, 8], keyI = 1.6, glint = [2, 2, 4.5], glintI = 16 } = {}) {
  const d = new THREE.DirectionalLight(0xfff0d8, keyI); d.position.set(...key); scene.add(d);
  const p = new THREE.PointLight(0xffd08a, glintI, 0, 1.6); p.position.set(...glint); scene.add(p);
}

/* ---------- scény ---------- */
const SCENES = {
  // logo pro navigaci a patičku — zepředu, průhledné pozadí (export.py ho ořízne a zachová alfu)
  // Neutral tone mapping drží žlutý odstín zlata (ACES ho posouvá do bronzu)
  // mírná perspektiva (ne ortho): každé místo čela odráží trochu jiný směr → přirozený kovový přechod
  "logo-weber": { w: 2400, h: 860, exposure: 0.95, toneMapping: THREE.NeutralToneMapping, async build(s, cam) {
    s.environment = logoEnvironment();
    s.add(await buildWeberLogo());
    cam.fov = 22;
    cam.position.set(0, 0, 16.8); cam.lookAt(0, 0, 0);
    // nejsvětlejší místo vlevo nahoře na hlavě klíče jako na předloze
    lights(s, { key: [-6, 8, 12], keyI: 2.2, glint: [-7, 3, 6], glintI: 45 });
    const warm = new THREE.PointLight(0xfff0d0, 18, 0, 1.6); warm.position.set(3, 2, 6); s.add(warm);
  } },

  "klic-hero": { w: 1800, h: 1100, build(s, cam) {
    s.add(backdrop(0.68, 0.35));
    const k = buildOrnateKey(goldMaterial()); k.rotation.set(-0.38, 0.32, Math.PI + 0.5); k.position.x = 1.9; k.scale.setScalar(1.05);
    s.add(k); lights(s, { glint: [3, 2, 4.5] }); cam.position.set(0, 0, 14); } },

  "pribeh": { w: 1200, h: 1500, build(s, cam) {
    s.add(backdrop(0.55, 0.3, 1.1));
    const k = buildOrnateKey(goldMaterial()); k.rotation.set(-0.55, 0.62, 2.1); k.position.set(0.2, -0.4, 0);
    s.add(k); lights(s, { glint: [-1, 3, 4] }); cam.fov = 20; cam.position.set(-1.2, 1.4, 6.8); cam.lookAt(-0.6, 0.9, 0); } },

  "gal-hlava": { w: 1000, h: 1250, build(s, cam) {
    s.add(backdrop(0.4, 0.35));
    const k = buildOrnateKey(goldMaterial({ roughness: 0.2 })); k.rotation.set(0.25, -0.45, -1.35);
    s.add(k); lights(s, { glint: [-2, 2.5, 4] }); cam.fov = 30; cam.position.set(0, 0, 12.5); } },

  "svc-klice": { w: 900, h: 1400, build(s, cam) {
    s.add(backdrop(0.5, 0.45));
    const mats = [goldMaterial(), steelMaterial({ color: "#8e8a82", roughness: 0.3 }), goldMaterial({ roughness: 0.34 })];
    [[-0.25, 0.9, 0.4], [0.1, -0.2, 0.1], [0.45, -1.3, -0.25]].forEach(([x, y, z], i) => {
      const k = buildBladeKey(mats[i]); k.position.set(x - 0.6, y, z); k.rotation.set(0.35, -0.5 + i * 0.12, 1.2 + i * 0.1); s.add(k);
    });
    lights(s, { glint: [1.5, 1, 3.5], glintI: 12 }); cam.fov = 30; cam.position.set(0.6, 0.2, 7.2); cam.lookAt(0, -0.1, 0); } },

  "gal-zuby": { w: 1400, h: 1000, build(s, cam) {
    s.add(backdrop(0.6, 0.55));
    const k = buildBladeKey(goldMaterial({ roughness: 0.22 })); k.rotation.set(0.5, -0.35, -0.1); k.position.set(-1.5, 0.2, 0);
    s.add(k); lights(s, { glint: [0.5, -1.5, 3], glintI: 14 }); cam.fov = 20; cam.position.set(0.4, -0.9, 5.2); cam.lookAt(0.1, -0.15, 0); } },

  "svc-autoklice": { w: 900, h: 1400, build(s, cam) {
    s.add(backdrop(0.5, 0.42));
    const g = new THREE.Group();
    const body = new THREE.ExtrudeGeometry(roundedRect(1.5, 2.5, 0.6), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.16, bevelSize: 0.14, bevelSegments: 10, curveSegments: 32 });
    body.translate(0, 0, -0.21);
    g.add(new THREE.Mesh(body, blackGlossMaterial()));
    const gold = goldMaterial();
    const trim = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedRect(1.62, 2.62, 0.66), { depth: 0.05, bevelEnabled: false, curveSegments: 32 }), gold);
    trim.position.z = -0.03; trim.scale.set(1.001, 1.001, 1); g.add(trim);
    [0.55, 0, -0.55].forEach((y, i) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 48), blackGlossMaterial()); b.rotation.x = Math.PI / 2; b.position.set(0, y - 0.1, 0.4); g.add(b);
      const r = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.018, 12, 64), gold); r.position.set(0, y - 0.1, 0.43); g.add(r);
      const ic = new THREE.Mesh(i === 1 ? new THREE.TorusGeometry(0.09, 0.015, 8, 32, Math.PI * 1.6) : new THREE.BoxGeometry(0.14, 0.03, 0.02), gold); ic.position.set(0, y - 0.1, 0.45); g.add(ic);
    });
    // vyklápěcí čepel
    const blade = new THREE.Group();
    blade.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape([[-0.17, 0], [0.17, 0], [0.17, 2.3], [0.05, 2.55], [-0.17, 2.55]]), { depth: 0.12, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.015, bevelSegments: 3 }), gold));
    const wave = []; for (let y = 0.15; y <= 2.35; y += 0.05) wave.push([Math.sin(y * 5) * 0.05 + 0.03, y]);
    const back = wave.slice().reverse().map(([x, y]) => [x - 0.07, y]);
    const track = new THREE.Mesh(new THREE.ExtrudeGeometry(shape([...wave, ...back]), { depth: 0.02, bevelEnabled: false }), steelMaterial({ color: "#6b5427", roughness: 0.45 }));
    track.position.z = 0.13; blade.add(track);
    blade.position.set(0, 1.35, -0.06); g.add(blade);
    g.rotation.set(0.35, -0.55, -0.42); g.position.set(0.1, -0.9, 0);
    s.add(g); lights(s, { glint: [2, 3, 4], glintI: 18 }); cam.fov = 32; cam.position.set(0, 0.3, 9.4); cam.lookAt(0, 0.1, 0); } },

  "svc-zamecnictvi": { w: 900, h: 1400, build(s, cam) {
    s.add(backdrop(0.5, 0.4));
    const g = new THREE.Group();
    const gold = goldMaterial({ roughness: 0.3 });
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.22, 96), gold); rose.rotation.x = Math.PI / 2; g.add(rose);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 24, 128), gold); lip.position.z = 0.11; g.add(lip);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.3, 96), steelMaterial({ color: "#a7a39b" })); cyl.rotation.x = Math.PI / 2; cyl.position.z = 0.16; g.add(cyl);
    const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.32, 96), gold); plug.rotation.x = Math.PI / 2; plug.position.z = 0.18; g.add(plug);
    const way = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.02), new THREE.MeshBasicMaterial({ color: 0x000000 })); way.position.z = 0.345; g.add(way);
    // klíč zasunutý do vložky: špička v rovině čela, hlava k divákovi
    const key = buildBladeKey(goldMaterial({ roughness: 0.22 }));
    key.rotation.set(0, Math.PI / 2, 0); key.scale.setScalar(0.8); key.position.set(0, 0.1, 0.35 + 3.2 * 0.8);
    g.add(key);
    g.rotation.set(-0.18, 0.95, 0); g.position.set(-0.7, -0.3, 0);
    s.add(g); lights(s, { key: [-3, 5, 6], glint: [2.5, 1.5, 5], glintI: 22 }); cam.fov = 32; cam.position.set(0, 0.3, 11.5); cam.lookAt(0, 0, 0); } },

  "gal-vlozka": { w: 1400, h: 1000, build(s, cam) {
    s.add(backdrop(0.55, 0.5));
    const g = new THREE.Group();
    const bodyGeo = new THREE.ExtrudeGeometry(euroProfile(), { depth: 3.4, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 64 });
    bodyGeo.translate(0, 0, -1.7);
    const body = new THREE.Mesh(bodyGeo, goldMaterial({ roughness: 0.38 })); g.add(body);
    const cam1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.5, 64), goldMaterial()); cam1.rotation.x = Math.PI / 2; cam1.position.z = 1.95; g.add(cam1);
    const face = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 12, 64), goldMaterial()); face.position.z = 2.2; g.add(face);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.72, 32), new THREE.MeshBasicMaterial({ color: 0x050505 })); screw.rotation.z = Math.PI / 2; screw.position.set(0, -1.1, 0); g.add(screw);
    const key = buildBladeKey(goldMaterial({ roughness: 0.22 })); key.rotation.set(0, Math.PI / 2, 0); key.scale.setScalar(0.75); key.position.set(0, 0.02, 2.2 + 3.2 * 0.75); g.add(key);
    g.rotation.set(0.28, -0.75, 0.04); g.position.set(-1.1, 0.35, 0);
    s.add(g); lights(s, { glint: [1, 2.5, 5], glintI: 22 }); cam.fov = 28; cam.position.set(0, 0.2, 12.5); } },

  "svc-bezpecnost": { w: 900, h: 1400, build(s, cam) {
    s.add(backdrop(0.5, 0.35, 0.9));
    const g = new THREE.Group();
    const gold = goldMaterial({ roughness: 0.24 });
    const bodyGeo = new THREE.ExtrudeGeometry(roundedRect(2.2, 2.0, 0.3), { depth: 0.7, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.12, bevelSegments: 10, curveSegments: 32 });
    bodyGeo.translate(0, 0, -0.35);
    g.add(new THREE.Mesh(bodyGeo, gold));
    const steel = steelMaterial({ color: "#c9c5bd", roughness: 0.18 });
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.16, 32, 96, Math.PI), steel); arc.position.y = 1.75; g.add(arc);
    [-0.72, 0.72].forEach((x, i) => { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, i ? 0.75 : 1.05, 48), steel); leg.position.set(x, i ? 1.38 : 1.23, 0); g.add(leg); });
    const hole = new THREE.Mesh(new THREE.ExtrudeGeometry(keyholeShape(1.4), { depth: 0.04, bevelEnabled: false }), new THREE.MeshBasicMaterial({ color: 0x020202 }));
    hole.position.set(0, -0.15, 0.5); g.add(hole);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 16, 64), steel); ring.position.set(0, 0.02, 0.5); g.add(ring);
    g.rotation.set(0.12, -0.5, 0.08); g.position.y = -0.55;
    s.add(g); s.environment = ENV_WARM; lights(s, { key: [-4, 6, 6], glint: [2.5, 1, 4], glintI: 24 }); cam.fov = 32; cam.position.set(0, 0.4, 10.6); cam.lookAt(0, 0.05, 0); } },

  "gal-freza": { w: 1400, h: 1000, build(s, cam) {
    s.add(backdrop(0.5, 0.6, 1.1));
    const k = buildBladeKey(goldMaterial({ roughness: 0.36 })); k.rotation.set(0.32, -0.28, 0); const u = 1.2; k.position.x = -u; s.add(k);
    const c = buildCutter(steelMaterial({ color: "#D6D8DB", roughness: 0.5 })); c.position.set(0, bladeBottom(u) - 0.78, -0.02); s.add(c);
    const n = 260, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const t = Math.random(), a = Math.PI * (0.05 + Math.random() * 0.5), sp = 0.4 + Math.random() * 1.6;
      pos[i * 3] = Math.cos(a) * sp * t * 1.4; pos[i * 3 + 1] = bladeBottom(u) + Math.sin(a) * sp * t - 2.5 * t * t * 0.6; pos[i * 3 + 2] = (Math.random() - 0.3) * t;
      const l = 1 - t; col[i * 3] = l; col[i * 3 + 1] = l * 0.72; col[i * 3 + 2] = l * l * 0.35;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    s.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05, map: sparkSprite(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    const hot = new THREE.PointLight(0xffa640, 4, 3.5, 1.4); hot.position.set(0, bladeBottom(u) + 0.05, 0.35); s.add(hot);
    lights(s, { glint: [-1, 2, 4], glintI: 10 }); s.environment = ENV_WARM; cam.fov = 24; cam.position.set(1.1, 0.35, 5.2); cam.lookAt(0.1, -0.45, 0); } },
};

/* ---------- běh ---------- */
async function render(name) {
  const def = SCENES[name];
  const scene = new THREE.Scene();
  scene.environment = ENV;
  const cam = def.ortho ? new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100) : new THREE.PerspectiveCamera(26, def.w / def.h, 0.1, 100);
  renderer.setClearColor(0x000000, 0); // průhledné pozadí (ostatní scény mají vlastní pozadí)
  await def.build(scene, cam);
  if (!def.ortho) cam.aspect = def.w / def.h;
  cam.updateProjectionMatrix();
  renderer.toneMapping = def.toneMapping ?? THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = def.exposure ?? 1.1;
  renderer.setSize(def.w, def.h, false);
  renderer.render(scene, cam);
  return new Promise((res) => renderer.domElement.toBlob(res, "image/png"));
}

const view = params.get("view");
const save = params.get("save");
if (view) {
  await render(view);
  log(`view: ${view}`);
} else if (save) {
  const names = save === "all" ? Object.keys(SCENES) : save.split(",");
  for (const n of names) {
    const blob = await render(n);
    const r = await fetch(`/__save?name=${n}.png`, { method: "POST", body: blob });
    log(`${n}: ${r.ok ? "uloženo" : "CHYBA " + r.status}`);
  }
  log("HOTOVO");
  document.title = "DONE";
} else {
  log("Scény:\n" + Object.keys(SCENES).map((n) => `  ?view=${n}`).join("\n") + "\n  ?save=all");
}
