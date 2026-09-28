// 3D model klíče od dveří: „Door Key“ by GUIBEL (sketchfab.com/Guibel), licence CC BY 4.0.
// FBX + PBR textury v assets/models/door-key/. loadDoorKey() vrací skupinu normalizovanou jako
// ornamentální klíč: délka ≈ 5,8 podél osy X, hlava na −X, čepel na +X, plocha klíče čelem k +Z.
import * as THREE from "three";
import { FBXLoader } from "../vendor/jsm/loaders/FBXLoader.js";

const BASE = new URL("../models/door-key/", import.meta.url);

export async function loadDoorKey({ length = 5.8, tint = null } = {}) {
  const tl = new THREE.TextureLoader();
  const tex = (name, srgb = false) =>
    tl.loadAsync(new URL(name, BASE).href).then((t) => {
      if (srgb) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    });

  // FBX v sobě odkazuje na původní PNG textury → bez tohoto by v konzoli byly chyby 404.
  // Textury načítáme zvlášť (WebP), odkazy z FBX nahradíme prázdným obrázkem.
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => (/\.(png|jpe?g|tga|tif{1,2}|bmp)$/i.test(url) ? "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=" : url));

  const [fbx, map, normalMap, roughnessMap, metalnessMap] = await Promise.all([
    new FBXLoader(manager).loadAsync(new URL("Key.fbx", BASE).href),
    tex("Key_BaseColor.webp", true),
    tex("Key_Normal.webp"),
    tex("Key_Roughness.webp"),
    tex("Key_Metallic.webp"),
  ]);

  const material = new THREE.MeshPhysicalMaterial({
    map, normalMap, roughnessMap, metalnessMap,
    metalness: 1, roughness: 1, envMapIntensity: 1.25,
  });
  if (tint) material.color.set(tint);
  fbx.traverse((o) => { if (o.isMesh) { o.material = material; o.castShadow = false; } });

  // --- normalizace orientace a velikosti ---
  fbx.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(fbx);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const axes = ["x", "y", "z"].sort((a, b) => size[b] - size[a]); // [délka, šířka, tloušťka]

  const inner = new THREE.Group();
  fbx.position.sub(center);
  inner.add(fbx);

  // natočit: délka → X, tloušťka → Z
  const orient = new THREE.Group();
  orient.add(inner);
  const basis = { x: new THREE.Vector3(1, 0, 0), y: new THREE.Vector3(0, 1, 0), z: new THREE.Vector3(0, 0, 1) };
  const m = new THREE.Matrix4().makeBasis(basis[axes[0]], basis[axes[1]], basis[axes[2]]).transpose();
  if (m.determinant() < 0) m.multiply(new THREE.Matrix4().makeScale(1, -1, 1));
  inner.quaternion.setFromRotationMatrix(m);
  inner.updateMatrixWorld(true);

  // hlava je širší než čepel → těžiště šířky leží na straně hlavy; hlavu dát na −X
  const pos = new THREE.Vector3();
  let wSum = 0, xw = 0;
  inner.traverse((o) => {
    if (!o.isMesh) return;
    const a = o.geometry.attributes.position;
    for (let i = 0; i < a.count; i += 3) {
      pos.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld);
      const w = Math.abs(pos.y);
      wSum += w; xw += w * pos.x;
    }
  });
  if (wSum && xw / wSum > 0) inner.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));

  const wrap = new THREE.Group();
  wrap.add(orient);
  wrap.scale.setScalar(length / size[axes[0]]);
  wrap.userData.rawSize = size.toArray().map((n) => +n.toFixed(3));
  wrap.userData.axes = axes;
  return wrap;
}
