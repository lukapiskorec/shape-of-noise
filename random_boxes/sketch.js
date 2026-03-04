/*

Random Boxes

Scatters rotating cubes at random positions throughout the scene.
Based on the basics_threejs_tsl example.

@LukaPiskorec 2026

*/


import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// ─── Configuration ────────────────────────────────────────────


// number of boxes to scatter in the scene
const BOX_COUNT = 100;

// size of each cube
const BOX_SIZE = 1.5;

// boxes are placed randomly within a cube of this side length
const SPREAD = 100;

// rotation speed in radians per millisecond
const ROTATION_SPEED = 0.0005;


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


// ─── Boxes ────────────────────────────────────────────────────


const geometry = new THREE.BoxGeometry( BOX_SIZE, BOX_SIZE, BOX_SIZE );
const material = new THREE.MeshNormalMaterial( { flatShading: true } );

// create all meshes, assign random positions, and add to scene
const meshes = [];

for ( let i = 0; i < BOX_COUNT; i++ ) {

  const mesh = new THREE.Mesh( geometry, material );
  mesh.position.set(
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD
  );
  scene.add( mesh );
  meshes.push( mesh );

}


// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  // rotate every box around the Y axis
  for ( let i = 0; i < BOX_COUNT; i++ ) {
    meshes[ i ].rotateY( ROTATION_SPEED * deltaTime );
  }

  renderer.render( scene, camera );

} );
