import * as THREE from "three";
import {
  Fn, uniform, float, vec3,
  positionLocal, normalLocal,
  floor, fract, sin, cos, dot, mix
} from "three/tsl";

import { OrbitControls } from "three/addons/controls/OrbitControls.js";


// ─────────────────────────────
// CONFIG
// ─────────────────────────────

const CONFIG = {
  COUNT: 5000,
  SPREAD: 200,
  NOISE_SCALE: 1.5,
  DISPLACEMENT: 0.4
};


// ─────────────────────────────
// RENDERER
// ─────────────────────────────

const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector("#canvas"),
  antialias: true
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

await renderer.init();


// ─────────────────────────────
// SCENE
// ─────────────────────────────

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  2000
);

camera.position.z = 80;


// ─────────────────────────────
// CONTROLS
// ─────────────────────────────

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─────────────────────────────
// PERLIN NOISE
// ─────────────────────────────

const randomGradient3D = Fn(([p]) => {

  const phi = fract(
    sin(dot(p, vec3(127.1, 311.7, 74.7))).mul(43758.5453)
  ).mul(Math.PI * 2);

  const theta = fract(
    sin(dot(p, vec3(269.5, 183.3, 246.1))).mul(43758.5453)
  ).mul(Math.PI);

  return vec3(
    sin(theta).mul(cos(phi)),
    sin(theta).mul(sin(phi)),
    cos(theta)
  );

});


const perlinNoise3D = Fn(([p]) => {

  const i = floor(p).toVar();
  const f = fract(p).toVar();

  const u = f.mul(f).mul(float(3).sub(f.mul(2)));

  const g000 = randomGradient3D(i);
  const g100 = randomGradient3D(i.add(vec3(1,0,0)));
  const g010 = randomGradient3D(i.add(vec3(0,1,0)));
  const g110 = randomGradient3D(i.add(vec3(1,1,0)));
  const g001 = randomGradient3D(i.add(vec3(0,0,1)));
  const g101 = randomGradient3D(i.add(vec3(1,0,1)));
  const g011 = randomGradient3D(i.add(vec3(0,1,1)));
  const g111 = randomGradient3D(i.add(vec3(1,1,1)));

  const d000 = dot(g000, f);
  const d100 = dot(g100, f.sub(vec3(1,0,0)));
  const d010 = dot(g010, f.sub(vec3(0,1,0)));
  const d110 = dot(g110, f.sub(vec3(1,1,0)));
  const d001 = dot(g001, f.sub(vec3(0,0,1)));
  const d101 = dot(g101, f.sub(vec3(1,0,1)));
  const d011 = dot(g011, f.sub(vec3(0,1,1)));
  const d111 = dot(g111, f.sub(vec3(1,1,1)));

  return mix(
    mix(mix(d000, d100, u.x), mix(d010, d110, u.x), u.y),
    mix(mix(d001, d101, u.x), mix(d011, d111, u.x), u.y),
    u.z
  ).add(0.5);

});


// ─────────────────────────────
// NOISE DISPLACEMENT
// ─────────────────────────────

const uTime = uniform(0);

const displacedPosition = Fn(() => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noise = perlinNoise3D(
    pos.mul(CONFIG.NOISE_SCALE)
      .add(vec3(0,0,uTime))
  )
  .sub(0.5)
  .mul(CONFIG.DISPLACEMENT);

  return pos.add(nrm.mul(noise));

})();


// ─────────────────────────────
// GEOMETRY
// ─────────────────────────────

const geometry = new THREE.IcosahedronGeometry(1.5, 10);

const material = new THREE.MeshNormalMaterial({
  flatShading: true
});

material.positionNode = displacedPosition;


// ─────────────────────────────
// INSTANCED MESH
// ─────────────────────────────

const mesh = new THREE.InstancedMesh(
  geometry,
  material,
  CONFIG.COUNT
);

const dummy = new THREE.Object3D();

for (let i = 0; i < CONFIG.COUNT; i++) {

  dummy.position.set(
    (Math.random() - 0.5) * CONFIG.SPREAD,
    (Math.random() - 0.5) * CONFIG.SPREAD,
    (Math.random() - 0.5) * CONFIG.SPREAD
  );

  dummy.updateMatrix();
  mesh.setMatrixAt(i, dummy.matrix);

}

scene.add(mesh);


// ─────────────────────────────
// RESIZE
// ─────────────────────────────

window.addEventListener("resize", () => {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);

});


// ─────────────────────────────
// ANIMATION
// ─────────────────────────────

const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {

  const delta = clock.getDelta();

  uTime.value += delta;
  mesh.rotation.y += delta * 0.2;


  renderer.render(scene, camera);

});