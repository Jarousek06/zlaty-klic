// Preciznost: makro záběr frézy, která obkresluje zuby zlatého klíče, s jiskrami.
import * as THREE from "three";
import { studioEnvironment, goldMaterial, steelMaterial, buildBladeKey, buildCutter, bladeBottom, sparkSprite, BLADE } from "./models.js";

export function initPrecision(canvas, { reduced = false, lowPower = false } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const maxDpr = lowPower ? 1.2 : 1.6;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer, { warmth: 1.3 });
  scene.fog = new THREE.Fog(0x050505, 6, 13);

  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 50);
  const target = new THREE.Vector3(0.1, -0.45, 0);

  const blade = buildBladeKey(goldMaterial({ roughness: 0.22 }));
  blade.rotation.set(0.12, -0.28, 0);
  scene.add(blade);

  const R = 0.78;
  const cutter = buildCutter(steelMaterial({ color: "#C4C7CB", roughness: 0.28 }), { R });
  scene.add(cutter);

  const hot = new THREE.PointLight(0xffa640, 0, 3.5, 1.4);
  scene.add(hot);
  const rim = new THREE.DirectionalLight(0xffe0b0, 1.2);
  rim.position.set(-3, 4, -2);
  scene.add(rim);

  /* ---- jiskry ---- */
  const N = lowPower ? 140 : 320;
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
  const vel = new Float32Array(N * 3), life = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const sparks = new THREE.Points(geo, new THREE.PointsMaterial({
    size: 0.05, map: sparkSprite(), vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
  }));
  sparks.frustumCulled = false;
  scene.add(sparks);
  let cursor = 0;

  function emit(x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const j = cursor++ % N;
      pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
      const a = Math.PI * (0.05 + Math.random() * 0.5);
      const sp = 1.6 + Math.random() * 2.8;
      vel[j * 3] = Math.cos(a) * sp;
      vel[j * 3 + 1] = Math.sin(a) * sp * 0.9;
      vel[j * 3 + 2] = (Math.random() - 0.3) * 1.8;
      life[j] = 0.35 + Math.random() * 0.5;
    }
  }

  /* ---- rozvržení ---- */
  let progress = 0, focus = 0, focusTarget = 0;
  function layout() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(Math.min(devicePixelRatio, maxDpr));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(layout).observe(canvas);
  layout();

  /* ---- smyčka ---- */
  let running = false, raf = 0, last = performance.now(), clock = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += reduced ? 0 : dt;
    focus += (focusTarget - focus) * (1 - Math.pow(0.02, dt));

    // kamera: dojezd podle scrollu, v kinorežimu blíž
    const wide = camera.aspect >= 1;
    const dist = (wide ? 8.4 : 9.6) - progress * 1.2 - focus * 1.4;
    const side = wide ? 1.4 : 0.3;
    camera.position.set(side - progress * 0.35 + Math.sin(clock * 0.2) * 0.08, 0.45 + progress * 0.15, dist);
    const tgt = target.clone();
    if (wide) tgt.x -= 1.9 * (1 - focus);
    camera.lookAt(tgt);

    // posuv klíče pod frézou (u = poloha na čepeli pod frézou)
    const u = 0.15 + (Math.sin(clock * 0.42 - 1.2) * 0.5 + 0.5) * (BLADE.len - 0.3);
    const edge = bladeBottom(u);
    blade.position.set(-u, 0, 0);
    // odpovídající bod ve světě (klíč je mírně natočený)
    const contact = new THREE.Vector3(u, edge, 0.05).applyEuler(blade.rotation).add(blade.position);
    cutter.position.set(contact.x, contact.y - R, contact.z - 0.02);
    cutter.userData.wheel.rotation.z -= dt * 22;

    const moving = !reduced;
    if (moving) emit(contact.x, contact.y, contact.z + 0.02, lowPower ? 2 : 4);
    hot.position.set(contact.x, contact.y + 0.05, contact.z + 0.3);
    hot.intensity = moving ? 2.2 + Math.random() * 2.2 : 0;

    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) { col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = 0; continue; }
      life[i] -= dt;
      vel[i * 3 + 1] -= 7.5 * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const l = Math.max(0, Math.min(1, life[i] / 0.6));
      col[i * 3] = l * 1.0; col[i * 3 + 1] = l * 0.72; col[i * 3 + 2] = l * l * 0.35;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(frame);
  }

  const play = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  let inView = false;
  new IntersectionObserver(([en]) => { inView = en.isIntersecting; inView && !document.hidden ? play() : stop(); }, { rootMargin: "100px" }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden || !inView ? stop() : play()));
  if (reduced) requestAnimationFrame(frame);

  return {
    setProgress: (p) => { progress = p; if (reduced && !running) requestAnimationFrame(frame); },
    setFocus: (on) => { focusTarget = on ? 1 : 0; },
  };
}
