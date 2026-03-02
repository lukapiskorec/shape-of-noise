/*

FBM Rock with TSL (Three.js Shading Language) Shaders

Same Fractal Brownian Motion rock as the original, but the noise is
computed entirely on the GPU using TSL node-based shaders.

Original approach: JS loop over every vertex, CPU noise library, slow
TSL approach:      noise defined as shader nodes, GPU runs it in parallel

The vertex displacement shader reads each vertex position, computes
8 octaves of FBM noise, and pushes the vertex outward along its normal.
All of this happens on the GPU every frame.

from: https://thebookofshaders.com/13/
TSL reference: https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders

@LukaPiskorec 2024

*/

import * as THREE from 'three';
import {
  Fn, uniform, float, vec3, vec4,
  positionLocal, normalLocal, transformedNormalView,
  Loop, abs, pow, fract, floor, dot, mix, sin, max
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// ─── TSL Noise Functions (these compile to GPU shader code) ─────


// Hash: maps a 3D position to a pseudo-random float in [0, 1]
// Uses fract-multiply-dot pattern (no swizzles — better WebGL2 compatibility)

const hash31 = Fn( ( [ p_immutable ] ) => {
  const p = vec3( p_immutable ).toVar();
  p.assign( fract( p.mul( vec3( 0.1031, 0.1030, 0.0973 ) ) ) );
  p.addAssign( dot( p, vec3( p.y, p.z, p.x ).add( 33.33 ) ) );
  return fract( dot( p, vec3( p.x, p.x, p.y ).add( vec3( p.y, p.z, p.z ) ) ) );
} );


// 3D Value Noise: samples hash at 8 corners of a cube, interpolates smoothly
// Like the original's noise.simplex3() but computed on the GPU

const valueNoise3D = Fn( ( [ p_immutable ] ) => {
  const p = vec3( p_immutable ).toVar();
  const i = floor( p );
  const f = fract( p );

  // quintic Hermite interpolation: 6t^5 - 15t^4 + 10t^3
  // smoother than linear, avoids visible grid artifacts
  const u = f.mul( f ).mul( f.mul( f.mul( 6.0 ).sub( 15.0 ) ).add( 10.0 ) );

  // hash at 8 corners of the unit cube (using float literals)
  const c000 = hash31( i );
  const c100 = hash31( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const c010 = hash31( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const c110 = hash31( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const c001 = hash31( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const c101 = hash31( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const c011 = hash31( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const c111 = hash31( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  // trilinear interpolation using the smoothed u coordinates
  return mix(
    mix( mix( c000, c100, u.x ), mix( c010, c110, u.x ), u.y ),
    mix( mix( c001, c101, u.x ), mix( c011, c111, u.x ), u.y ),
    u.z
  );
} );


// ─── Renderer & Scene ───────────────────────────────────────────


// WebGPU renderer (falls back to WebGL2 in older browsers)
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
camera.position.z = 120;

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();


// ─── FBM Parameters (uniforms = live-tweakable from JS) ─────────


const sphereRadius = 10.0;

const uAmplitude  = uniform( 5.0 );   // initial noise amplitude
const uFrequency  = uniform( 0.05 );  // initial noise frequency
const uLacunarity = uniform( 2.5 );   // frequency multiplier per octave
const uGain       = uniform( 0.35 );  // amplitude multiplier per octave
const uPower      = uniform( 2.0 );   // exponent for puffy/ridge shaping


// ─── TSL Vertex Displacement: FBM rock shape ───────────────────
//
// This function runs on the GPU for every vertex, every frame.
// It replaces the CPU for-loop from the original sketch.js.


const rockPositionNode = Fn( () => {

  const pos = positionLocal.toVar();  // original sphere vertex
  const nrm = normalLocal.toVar();    // original sphere normal

  // vertical blend: bottom of sphere → puffy, top → ridged
  // amt goes from 0 (south pole) to 1 (north pole)
  const amt = pos.y.add( sphereRadius ).div( sphereRadius * 2.0 );
  const puffyWeight = float( 1.0 ).sub( amt ).mul( 0.5 );
  const ridgeWeight = amt;

  // FBM: accumulate 8 octaves of noise
  const offset = float( 0.0 ).toVar();
  const amp = float( uAmplitude ).toVar();
  const freq = float( uFrequency ).toVar();

  Loop( 8, () => {

    // value noise returns [0,1], remap to [-1,1] to match simplex range
    const n = valueNoise3D( pos.mul( freq ) ).mul( 2.0 ).sub( 1.0 );

    // puffy noise: pow(1 - n, power) — soft, round, bulgy shapes
    // max(0) prevents negative input to pow which produces NaN on GPU
    const puffy = pow( max( float( 0.0 ), float( 1.0 ).sub( n ) ), uPower );

    // ridge noise: pow(1 - |n|, power) — sharp creases and peaks
    const ridge = pow( max( float( 0.0 ), float( 1.0 ).sub( abs( n ) ) ), uPower );

    // blend puffy and ridge based on vertical position
    offset.addAssign(
      puffyWeight.mul( amp ).mul( puffy )
        .add( ridgeWeight.mul( amp ).mul( ridge ) )
    );

    freq.mulAssign( uLacunarity );
    amp.mulAssign( uGain );

  } );

  // push vertex outward along its normal by the accumulated offset
  const displaced = pos.add( nrm.mul( offset ) );

  // "monolith" deformation: stretch vertically (2x), compress depth (0.5x)
  return displaced.mul( vec3( 1.0, 2.0, 0.5 ) );

} )();


// ─── Geometry & Material ────────────────────────────────────────


const geometry = new THREE.IcosahedronGeometry( sphereRadius, 50 );

// MeshNormalMaterial shows surface normals as colors — same as original
// flatShading computes one normal per triangle face for the faceted look
// DoubleSide prevents holes from inverted triangle winding
const material = new THREE.MeshNormalMaterial( { flatShading: true, side: THREE.DoubleSide } );
material.positionNode = rockPositionNode;

// Boost color saturation: expand the normal→color mapping range,
// then clamp. This pushes colors away from gray toward pure hues.
material.outputNode = vec4(
  transformedNormalView.normalize().mul( 0.8 ).add( 0.5 ).clamp( 0.0, 1.0 ),
  1.0
);

const rockMesh = new THREE.Mesh( geometry, material );
scene.add( rockMesh );


// ─── Animation Loop ─────────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  rockMesh.rotateY( 0.0005 * deltaTime );

  renderer.render( scene, camera );

} );
