/*

Perlin Noise Heightmap

A subdivided plane with vertices displaced up/down by 3D Perlin noise,
creating an animated terrain. Vertices are colored on a cyan-to-magenta
gradient based on displacement height.

The plane samples a 2D slice of 3D noise (all vertices share z = 0 in
local space). Scrolling through the Z axis of the noise field over time
animates the terrain.

Based on the threejs_perlin_noise icosahedron example, adapted for a
flat grid topology with height-based vertex coloring.

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


const randomGradient3D = Fn( ( [ p ] ) => {

  const phi   = fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ).mul( 43758.5453 ) ).mul( Math.PI * 2 );
  const theta = fract( sin( dot( p, vec3( 269.5, 183.3, 246.1 ) ) ).mul( 43758.5453 ) ).mul( Math.PI );
  return vec3(
    sin( theta ).mul( cos( phi ) ),
    sin( theta ).mul( sin( phi ) ),
    cos( theta )
  );

} );


const perlinNoise3D = Fn( ( [ p ] ) => {

  const i = floor( p ).toVar();
  const f = fract( p ).toVar();

  const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

  const g000 = randomGradient3D( i );
  const g100 = randomGradient3D( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const g010 = randomGradient3D( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const g110 = randomGradient3D( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const g001 = randomGradient3D( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const g101 = randomGradient3D( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const g011 = randomGradient3D( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const g111 = randomGradient3D( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  const d000 = dot( g000, f );
  const d100 = dot( g100, f.sub( vec3( 1.0, 0.0, 0.0 ) ) );
  const d010 = dot( g010, f.sub( vec3( 0.0, 1.0, 0.0 ) ) );
  const d110 = dot( g110, f.sub( vec3( 1.0, 1.0, 0.0 ) ) );
  const d001 = dot( g001, f.sub( vec3( 0.0, 0.0, 1.0 ) ) );
  const d101 = dot( g101, f.sub( vec3( 1.0, 0.0, 1.0 ) ) );
  const d011 = dot( g011, f.sub( vec3( 0.0, 1.0, 1.0 ) ) );
  const d111 = dot( g111, f.sub( vec3( 1.0, 1.0, 1.0 ) ) );

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
camera.position.set( 0, 8, 8 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

// ambient light — uniform illumination, no directional shading
scene.add( new THREE.AmbientLight( 0xffffff, 1.0 ) );


// ─── Noise Displacement ───────────────────────────────────────


const uTime = uniform( 0.0 );
const noiseScale = 0.5;
const displacementStrength = 1.5;

// vertex displacement: push each vertex along its normal by noise value
const displacedPosition = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( noiseScale ).add( vec3( 0.0, 0.0, uTime ) );
  const noiseVal = perlinNoise3D( noiseInput ).sub( 0.5 ).mul( displacementStrength );

  return pos.add( nrm.mul( noiseVal ) );

} )();

// height-based color: cyan (valleys) → magenta (peaks)
const colorNoise = perlinNoise3D( positionLocal.mul( noiseScale ).add( vec3( 0.0, 0.0, uTime ) ) );
const heightColor = mix( vec3( 0.0, 1.0, 1.0 ), vec3( 1.0, 0.0, 1.0 ), colorNoise );


// ─── Geometry & Material ──────────────────────────────────────


const geometry = new THREE.PlaneGeometry( 10, 10, 100, 100 );

const material = new THREE.MeshStandardMaterial( { flatShading: true, side: THREE.DoubleSide } );
material.positionNode = displacedPosition;
material.colorNode = heightColor;

const mesh = new THREE.Mesh( geometry, material );
mesh.rotation.x = -Math.PI / 2; // lay flat in XZ (ground plane)
scene.add( mesh );


// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  uTime.value += deltaTime * 0.0005;

  renderer.render( scene, camera );

} );
