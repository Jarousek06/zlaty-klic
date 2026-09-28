// Hero: 3D klíč ve WebGL s jemnou reakcí na myš.
// Volby: intro (vynoření ze tmy + přejezd světla), neutral (bílé světlo pro stříbrný web).
// canvas[data-fit="center"] = klíč vycentrovaný v rámu; jinak rozvržení přes celé hero (luxusní verze).
import * as THREE from "three";
import { studioEnvironment, goldMaterial, buildOrnateKey, ease, clamp01 } from "./models.js";
import { loadDoorKey } from "./doorkey.js";

export function initHero(canvas, { revealAt = performance.now(), reduced = false, lowPower = false, intro = true, neutral = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = neutral ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = neutral ? 1.05 : 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxDpr = lowPower ? 1.3 : 1.8;
  const playIntro = intro && !reduced;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, { neutral });

  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  const pivot = new THREE.Group();   // pozice / měřítko / myš
  const holder = new THREE.Group();  // základní póza klíče
  // cylindrický klíč (model „Door Key“ by GUIBEL, CC BY); když se nenačte, ornamentální klíč z kódu
  const key = new THREE.Group();
  holder.add(key);
  loadDoorKey()
    .then((k) => key.add(k))
    .catch(() => {
      key.add(buildOrnateKey(goldMaterial()));
      holder.rotation.set(-0.38, 0.32, Math.PI + 0.5);
    });
  // stoupající diagonála: hlava vlevo dole, čepel se zuby vpravo nahoře, ražba čitelná zepředu
  holder.rotation.set(-0.3, 0.34, 0.42);
  holder.userData.baseY = 0.34;
  pivot.add(holder);
  scene.add(pivot);

  const keyLight = new THREE.DirectionalLight(neutral ? 0xffffff : 0xfff0d8, 1.6);
  keyLight.position.set(4, 6, 8);
  scene.add(keyLight);
  const sweep = new THREE.PointLight(neutral ? 0xffffff : 0xffd08a, 0, 0, 1.6);
  scene.add(sweep);

  /* ---- rozvržení ---- */
  const centered = canvas.dataset.fit === "center";
  const VH = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const viewW = VH * camera.aspect;
    if (centered) {
      // natočený klíč zabírá cca 6,4 × 4,8 jednotky
      pivot.scale.setScalar(Math.min((viewW * 0.84) / 6.4, (VH * 0.84) / 4.8));
      pivot.position.set(0, 0, 0);
    } else if (camera.aspect >= 1.05) {
      pivot.scale.setScalar(Math.min(1.3, (viewW * 0.52) / 5.2, (VH * 0.95) / 4.1));
      pivot.position.set(viewW * 0.2, 0.05, 0);
    } else {
      // na výšku: klíč v horní části, text je zarovnaný dolů (CSS)
      pivot.scale.setScalar(Math.min(0.85, (viewW * 0.78) / 5.8));
      pivot.position.set(viewW * 0.03, VH * 0.29, 0);
    }
  }
  new ResizeObserver(layout).observe(canvas);
  layout();

  /* ---- myš ---- */
  let tx = 0, ty = 0, mx = 0, my = 0;
  if (!reduced) {
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      tx = (e.clientX / innerWidth - 0.5) * 2;
      ty = (e.clientY / innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  /* ---- smyčka ---- */
  let running = false, raf = 0, last = performance.now();

  function frame(now) {
    const t = now / 1000;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const since = now - revealAt;

    // vynoření ze tmy (jen v intro režimu)
    const e = playIntro ? ease.outCubic(clamp01((since + 300) / 2600)) : 1;
    if (playIntro) renderer.toneMappingExposure = 0.02 + e * 1.08;
    holder.position.z = -2.4 * (1 - e);
    holder.rotation.y = holder.userData.baseY + 1.1 * Math.pow(1 - e, 2);

    // myš: jemné natočení + světlo za kurzorem
    const k = 1 - Math.pow(0.001, dt);
    mx += (tx - mx) * k * 0.9;
    my += (ty - my) * k * 0.9;
    pivot.rotation.y = mx * 0.17;
    pivot.rotation.x = my * 0.11;
    key.position.y = reduced ? 0 : Math.sin(t * 0.55) * 0.05;
    key.rotation.x = reduced ? 0 : Math.sin(t * 0.35) * 0.025;

    const s = playIntro ? clamp01((since - 500) / 2400) : 1;
    if (s < 1) {
      sweep.position.set(THREE.MathUtils.lerp(-7, 7, ease.inOutSine(s)) + pivot.position.x, 2.6 - s * 3, 4.5);
      sweep.intensity = Math.sin(s * Math.PI) * 90 + 14 * s;
    } else {
      sweep.position.set(pivot.position.x + mx * 4, -my * 3 + 1.5, 4.5);
      sweep.intensity = 14 + Math.sin(t * 0.8) * 3;
    }

    renderer.render(scene, camera);
    if (!canvas.classList.contains("is-ready")) canvas.classList.add("is-ready");
    if (running) raf = requestAnimationFrame(frame);
  }

  const play = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  let inView = true;
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; inView && !document.hidden ? play() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden || !inView ? stop() : play()));
  play();

  return { renderer, stop, play };
}
