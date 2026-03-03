/*

Perlin Noise Vertex Displacement

An IcosahedronGeometry with vertices displaced along their normals
by 3D Perlin noise. The noise field is animated by scrolling through
the third noise dimension over time, creating an organic morphing effect.

Noise approach: extends the 2D Perlin noise pattern from
https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders
to 3D — gradient vectors on a sphere, dot products at 8 cube corners,
trilinear interpolation with Hermite smoothstep.

@LukaPiskorec 2025

*/


import * as THREE from 'three';
import {
  Fn, uniform, float, vec3,
  positionLocal, normalLocal,
  floor, fract, sin, cos, dot, mix
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// ─── 3D Perlin Noise (TSL — runs on GPU) ──────────────────────


// Pseudo-random 3D gradient at integer lattice point p.
// Two hash-based angles define a direction on the unit sphere.
// Extends the 2D approach (single angle → unit circle) to 3D.

const randomGradient3D = Fn( ( [ p ] ) => {

  const phi   = fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ).mul( 43758.5453 ) ).mul( Math.PI * 2 );
  const theta = fract( sin( dot( p, vec3( 269.5, 183.3, 246.1 ) ) ).mul( 43758.5453 ) ).mul( Math.PI );
  return vec3(
    sin( theta ).mul( cos( phi ) ),
    sin( theta ).mul( sin( phi ) ),
    cos( theta )
  );

} );


// 3D Perlin noise: gradient dot products at 8 cube corners,
// smoothly interpolated with Hermite smoothstep.
// Returns values roughly centered around 0.5.

const perlinNoise3D = Fn( ( [ p ] ) => {

  const i = floor( p ).toVar();
  const f = fract( p ).toVar();

  // smoothstep: 3f² − 2f³
  const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

  // gradients at 8 cube corners
  const g000 = randomGradient3D( i );
  const g100 = randomGradient3D( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const g010 = randomGradient3D( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const g110 = randomGradient3D( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const g001 = randomGradient3D( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const g101 = randomGradient3D( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const g011 = randomGradient3D( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const g111 = randomGradient3D( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  // dot products with distance vectors from each corner
  const d000 = dot( g000, f );
  const d100 = dot( g100, f.sub( vec3( 1.0, 0.0, 0.0 ) ) );
  const d010 = dot( g010, f.sub( vec3( 0.0, 1.0, 0.0 ) ) );
  const d110 = dot( g110, f.sub( vec3( 1.0, 1.0, 0.0 ) ) );
  const d001 = dot( g001, f.sub( vec3( 0.0, 0.0, 1.0 ) ) );
  const d101 = dot( g101, f.sub( vec3( 1.0, 0.0, 1.0 ) ) );
  const d011 = dot( g011, f.sub( vec3( 0.0, 1.0, 1.0 ) ) );
  const d111 = dot( g111, f.sub( vec3( 1.0, 1.0, 1.0 ) ) );

  // trilinear interpolation
  return mix(
    mix( mix( d000, d100, u.x ), mix( d010, d110, u.x ), u.y ),
    mix( mix( d001, d101, u.x ), mix( d011, d111, u.x ), u.y ),
    u.z
  ).add( 0.5 );

} );


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
camera.position.z = 5;

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();


// ─── Noise Displacement ───────────────────────────────────────


const uTime = uniform( 0.0 );
const noiseScale = 2.0;
const displacementStrength = 0.3;

const displacedPosition = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  // sample 3D noise at scaled position, animate by scrolling through Z
  const noiseInput = pos.mul( noiseScale ).add( vec3( 0.0, 0.0, uTime ) );
  const noiseVal = perlinNoise3D( noiseInput ).sub( 0.5 ).mul( displacementStrength );

  // push vertex outward/inward along its normal
  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────


const geometry = new THREE.IcosahedronGeometry( 1.5, 30 );

const material = new THREE.MeshNormalMaterial( { flatShading: true } );
material.positionNode = displacedPosition;

const mesh = new THREE.Mesh( geometry, material );
scene.add( mesh );


// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  // scroll through noise field
  uTime.value += deltaTime * 0.0005;

  mesh.rotateY( 0.0003 * deltaTime );

  renderer.render( scene, camera );

} );
