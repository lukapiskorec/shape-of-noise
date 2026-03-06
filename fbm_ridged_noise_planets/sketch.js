/*

FBM / Ridged Noise Planets

Two overlapping icosahedrons, each displaced by its own noise function.
Noise is sampled from the 3D vertex position so the displacement is
continuous across the sphere surface.

  - Planet A (solid):     FBM noise — smooth, organic terrain
  - Planet B (wireframe): Ridged noise — sharp ridges and creases

Based on the fbm_ridged_noise_heightmap example.

@LukaPiskorec 2026

*/


import * as THREE from 'three';
import { uniform, float, vec3, positionLocal, normalLocal } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const { createFBM, createRidgedNoise } = window.NoiseLib;


// ─── Planet A Configuration (solid, FBM) ──────────────────────


const NOISE_TYPE_A            = 'fbm';
const OCTAVES_A               = 6;
const LACUNARITY_A            = 2.0;
const GAIN_A                  = 0.5;
const NOISE_SCALE_A           = 0.5;
const DISPLACEMENT_STRENGTH_A = 1.5;
const RADIUS_A                = 2.0;
const TRAVEL_DIRECTION_A      = [ 0, 0, 1 ];
const TRAVEL_SPEED_A          = 0.3;


// ─── Planet B Configuration (wireframe, Ridged) ───────────────


const NOISE_TYPE_B            = 'ridged';
const OCTAVES_B               = 4;
const LACUNARITY_B            = 2.5;
const GAIN_B                  = 0.4;
const NOISE_SCALE_B           = 0.8;
const DISPLACEMENT_STRENGTH_B = 1.0;
const RADIUS_B                = 2.5;
const TRAVEL_DIRECTION_B      = [ 1, 0, 0 ];
const TRAVEL_SPEED_B          = 0.2;


// ─── Shared ───────────────────────────────────────────────────


const DETAIL = 30;  // icosahedron subdivision level


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
camera.position.set( 0, 4, 8 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─── Displacement Helper ──────────────────────────────────────


// builds a TSL position node that displaces vertices along their
// normals using the given noise function and parameters
function makeDisplacement( noiseType, noiseParams, scale, strength, travelDir, uTime ) {

  const noiseFn = noiseType === 'ridged'
    ? createRidgedNoise( noiseParams )
    : createFBM( noiseParams );

  const dir = vec3( travelDir[ 0 ], travelDir[ 1 ], travelDir[ 2 ] );

  // sample noise from the 3D vertex position — continuous across the sphere
  const noiseInput = positionLocal.mul( scale ).add( dir.mul( uTime ) );
  const noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( strength );

  return positionLocal.add( normalLocal.mul( noiseVal ) );

}


// ─── Planet A (solid) ─────────────────────────────────────────


const uTimeA = uniform( 0.0 );

const displacementA = makeDisplacement(
  NOISE_TYPE_A,
  { octaves: OCTAVES_A, lacunarity: LACUNARITY_A, gain: GAIN_A },
  NOISE_SCALE_A, DISPLACEMENT_STRENGTH_A, TRAVEL_DIRECTION_A, uTimeA
);

const geometryA = new THREE.IcosahedronGeometry( RADIUS_A, DETAIL );
const materialA = new THREE.MeshNormalMaterial( { flatShading: true } );
materialA.positionNode = displacementA;

const meshA = new THREE.Mesh( geometryA, materialA );
scene.add( meshA );


// ─── Planet B (wireframe) ─────────────────────────────────────


const uTimeB = uniform( 0.0 );

const displacementB = makeDisplacement(
  NOISE_TYPE_B,
  { octaves: OCTAVES_B, lacunarity: LACUNARITY_B, gain: GAIN_B },
  NOISE_SCALE_B, DISPLACEMENT_STRENGTH_B, TRAVEL_DIRECTION_B, uTimeB
);

const geometryB = new THREE.IcosahedronGeometry( RADIUS_B, DETAIL );
const materialB = new THREE.MeshNormalMaterial( { flatShading: true, side: THREE.DoubleSide } );
materialB.positionNode = displacementB;

const meshB = new THREE.Mesh( geometryB, materialB );
meshB.position.x = 6;
scene.add( meshB );


// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime   = currentTime - time;
  time = currentTime;

  const dt = deltaTime * 0.001;
  uTimeA.value += dt * TRAVEL_SPEED_A;
  uTimeB.value += dt * TRAVEL_SPEED_B;

  renderer.render( scene, camera );

} );
