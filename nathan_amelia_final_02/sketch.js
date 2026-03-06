/*

FBM / Ridged Noise Heightmap

A subdivided plane with vertices displaced by layered noise functions:
  - Fractal Brownian Motion (FBM): smooth, organic terrain
  - Ridged Noise: sharp creases and mountain-like ridges

Both are built on 3D Perlin noise and animated by scrolling through
the noise field over time. Switch between them with NOISE_TYPE below.

Based on the perlin_noise_heightmap example.

@LukaPiskorec 2026

*/


import * as THREE from 'three';
import { Fn, uniform, float, vec3, positionLocal, normalLocal } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const { createFBM, createRidgedNoise } = window.NoiseLib;


// ─── Configuration ────────────────────────────────────────────


// noise type: 'fbm' or 'ridged'
const NOISE_TYPE_WATER = 'ridged';

// noise layering parameters (baked at shader compile time)
const OCTAVES_WATER    = 1;      // number of noise layers
const LACUNARITY_WATER = 2.0;    // frequency multiplier per octave
const GAIN_WATER       = 1.0;    // amplitude multiplier per octave

// displacement
const NOISE_SCALE_WATER            = 0.5;   // spatial frequency of the noise
const DISPLACEMENT_STRENGTH_WATER    = 1.5;   // how far vertices are pushed

// animation — direction and speed of noise travel
const TRAVEL_DIRECTION_WATER   = [ 0, 0, 1 ];  // axis of travel through noise field
const TRAVEL_SPEED_WATER      = 0.1;          // units per second


// ─── Renderer & Scene ─────────────────────────────────────────


const renderer = new THREE.WebGPURenderer( {
  canvas: document.querySelector( '#canvas' ),
  antialias: true,
} );
renderer.setSize( window.innerWidth, window.innerHeight );
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000000 );

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 1, 1000
);
camera.position.set( 0, 10, 10 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

// ─── Noise Displacement ───────────────────────────────────────


const noiseParams_water = { OCTAVES_WATER: OCTAVES_WATER, LACUNARITY_WATER: LACUNARITY_WATER, GAIN_WATER: GAIN_WATER };

const noiseFn_water = NOISE_TYPE_WATER   === 'ridged'
  ? createRidgedNoise( noiseParams_water )
  : createFBM( noiseParams_water );

const uTime_water = uniform( 1.5 );
const TravelDir_water = vec3( TRAVEL_DIRECTION_WATER  [ 1 ], 2*TRAVEL_DIRECTION_WATER  [ 2 ], TRAVEL_DIRECTION_WATER  [ 2 ] );

// vertex displacement: push each vertex along its normal by noise value
const displacedPosition_water = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( NOISE_SCALE_WATER   ).add( TravelDir_water.mul( uTime_water ) );
  const noiseVal   = noiseFn_water( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH_WATER   );

  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────
// Other material_waters to try:
//   MeshPhongMaterial({ azur: 0x007fff }) — classic shiny surface (needs lights)
// White directional light at half intensity shining from the top.
const dirlight = new THREE.DirectionalLight( 0xfff54f, 5.3 );
//dirlight.position.set(0,2,0)
scene.add( dirlight );
// white spotlight shining from the side, modulated by a texture
//const spotLight = new THREE.SpotLight( 0xffffff );
//spotLight.position.set( 100, 1000, 100 );
/*spotLight.map = new THREE.TextureLoader().load( 8 );
spotLight.castShadow = true;
spotLight.shadow.mapSize.width = 1024;
spotLight.shadow.mapSize.height = 1024;
spotLight.shadow.camera.near = 500;
spotLight.shadow.camera.far = 4000;
spotLight.shadow.camera.fov = 30;
const spotight = new THREE.SpotLight( 0xffffff );
//spotLight.position.set( 10, 10, 10 );
scene.add( spotLight );
const spotLightHelper = new THREE.SpotLightHelper( spotLight );
scene.add( spotLightHelper );*/

// 🆙 LUMIÈRE SPÉCIALE RÉFLÈTS EAU
/*const sunLight = new THREE.DirectionalLight(0xffffff, 3.0);  // Blanc intense
sunLight.position.set(10, 15, 5);
scene.add(sunLight);
*/


const geometry_water = new THREE.PlaneGeometry( 50, 50, 500, 500 );




const material_water = new THREE.MeshPhongMaterial({ 
  color: 0x004499,           // Bleu encore plus profond
  opacity: 0.75,             // 🆙 PLUS TRANSPARENT = plus de profondeur
  transparent: true,
  side: THREE.DoubleSide
});
material_water.positionNode = displacedPosition_water;
material_water.attenuationDistance = 0.1; 
const mesh_water = new THREE.Mesh( geometry_water, material_water );
mesh_water.rotation.x = -Math.PI / 2;
scene.add( mesh_water );
const color = 0x007fff;
const intensity = 10;
const light = new THREE.AmbientLight(color, intensity);
scene.add(light);
let cx, cy;      // centre de l'objet
let r = 120;     // rayon de l'objet
function setup() {
  createCanvas(600, 400);      // taille de la fenêtre
  cx = width / 2;
  cy = height / 2;
  noStroke();
}

function draw() {
  background(5, 10, 25);       // fond sombre

  // couleur de base "eau" de l'objet
  let baseColor = color(0, 60, 120);

  // distance souris -> centre
  let d = dist(mouseX, mouseY, cx, cy);

  // plus la souris est proche, plus la lumière est forte
  let lightStrength = map(d, 0, 200, 1, 0);
  lightStrength = constrain(lightStrength, 0, 1);

  // dessin de l'objet (cercle) avec un léger dégradé
  drawWaterObject(baseColor);

  // halo lumineux bleu clair qui suit la souris sur l'objet
  drawWaterLight(lightStrength);
}

// dessine l'objet "eau"
function drawWaterObject(baseColor) {
  // dégradé simple : cercle plus clair au centre
  for (let rr = r; rr > 0; rr -= 2) {
    let t = rr / r;
    let c = lerpColor(baseColor, color(0, 180, 220), 1 - t);
    fill(c);
    ellipse(cx, cy, rr * 2, rr * 2);
  }
}

// dessine la lumière d'eau liée à la souris
function drawWaterLight(strength) {
  if (strength <= 0) return;

  // couleur de la lumière (bleu eau très clair)
  let lightColor = color(0, 255, 255, 200 * strength);

  // on dessine plusieurs cercles flous pour faire un halo
  for (let i = 0; i < 5; i++) {
    let alpha = 80 * strength * (1 - i * 0.15);
    fill(255, 255, 255, alpha);
    let size = 140 + i * 40;
    ellipse(mouseX, mouseY, size, size);
  }

  // petit reflet très lumineux au centre
  fill(lightColor);
  ellipse(mouseX, mouseY, 40, 40);
}

// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime   = currentTime - time;
  time = currentTime;

  uTime_water.value += deltaTime *0.01 * TRAVEL_SPEED_WATER  ;

  renderer.render( scene, camera );

} );
