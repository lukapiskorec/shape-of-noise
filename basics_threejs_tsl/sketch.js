/*

Three.js Basics: Rotating Cube with Orbit Controls

This is the simplest possible Three.js scene using the modern WebGPU
renderer and ES module imports. It draws a spinning cube that you can
orbit around with the mouse.

Every Three.js scene needs three things:
  1. A RENDERER  — draws pixels to the screen
  2. A SCENE     — the container that holds all your 3D objects
  3. A CAMERA    — the viewpoint from which the scene is seen

On top of that, every visible object is a MESH, which combines:
  - a GEOMETRY  — the shape (what vertices/triangles make it up)
  - a MATERIAL  — the surface appearance (color, shading, texture)

This boilerplate is structured so you can extend it into a more complex
sketch (like the FBM rock example) by adding TSL imports and a
positionNode to the material.

@LukaPiskorec 2024

*/


// ─── Imports ────────────────────────────────────────────────────
//
// 'three' gives us the entire Three.js library (renderer, geometries,
// materials, math, etc.). The import map in index.html tells the
// browser to fetch this from the CDN.
//
// OrbitControls is an "addon" — a helper that lets the user rotate,
// zoom, and pan the camera with the mouse. It's not part of the core
// library, so we import it separately from three/addons/.

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';


// ─── Renderer ───────────────────────────────────────────────────
//
// The renderer is the engine that draws 3D graphics onto a 2D canvas.
//
// WebGPURenderer is the modern Three.js renderer. It uses the WebGPU
// API if the browser supports it, and automatically falls back to
// WebGL2 otherwise. It also enables the TSL (Three.js Shading
// Language) node system, which we'll use in more advanced examples.
//
// 'antialias: true' smooths jagged edges on diagonal lines.
//
// 'await renderer.init()' waits for the GPU backend to be ready
// before we start rendering. This is required for WebGPURenderer.
// (The 'await' keyword works here because our script is an ES module.)

const renderer = new THREE.WebGPURenderer( {
  canvas: document.querySelector( '#canvas' ),
  antialias: true,
} );

// Make the canvas fill the entire browser window
renderer.setSize( window.innerWidth, window.innerHeight );

// Wait for the GPU backend (WebGPU or WebGL2) to initialize
await renderer.init();


// ─── Scene ──────────────────────────────────────────────────────
//
// The scene is like a stage — everything you want to see must be
// added to it. You can add meshes, lights, helpers, groups, etc.
//
// Setting a background color is optional. Without it, the canvas
// is transparent (shows the page background, usually white).

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000000 ); // black


// ─── Camera ─────────────────────────────────────────────────────
//
// The camera defines what portion of the scene is visible.
//
// PerspectiveCamera simulates human vision — objects farther away
// appear smaller. Its four parameters are:
//
//   fov  (45)  — field of view in degrees (vertical). Larger = wider lens.
//   aspect     — width/height ratio. Must match the canvas or the image
//                will look squished. We use window dimensions here.
//   near (1)   — objects closer than this are invisible (clipped).
//   far (1000) — objects farther than this are invisible (clipped).
//
// The camera starts at the origin (0,0,0) facing down -Z. We move
// it back along +Z so the cube (at the origin) is in front of us.

const camera = new THREE.PerspectiveCamera(
  45,                                         // fov
  window.innerWidth / window.innerHeight,     // aspect ratio
  1,                                          // near clipping plane
  1000                                        // far clipping plane
);

// Move the camera backward so we can see the cube at the origin.
// Larger Z = further away. Try changing this to see the effect.
camera.position.z = 5;


// ─── Orbit Controls ─────────────────────────────────────────────
//
// OrbitControls lets the user interact with the scene:
//   - Left mouse button:  rotate (orbit) around the target point
//   - Scroll wheel:       zoom in/out
//   - Right mouse button: pan (shift the view sideways)
//
// It needs two things: the camera to move, and the DOM element to
// listen for mouse/touch events on (the canvas).

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─── Geometry ───────────────────────────────────────────────────
//
// A geometry defines the shape of a 3D object as a set of vertices
// (points in space) connected into triangles.
//
// BoxGeometry creates a cube (or rectangular box). Parameters:
//   width, height, depth  — size along each axis
//
// Three.js has many built-in geometries: BoxGeometry, SphereGeometry,
// IcosahedronGeometry, PlaneGeometry, CylinderGeometry, etc.
//
// For the FBM rock example, this would be replaced with:
//   new THREE.IcosahedronGeometry( 10, 50 )
// which creates a sphere-like shape with many subdivisions.

const geometry = new THREE.BoxGeometry( 1.5, 1.5, 1.5 );


// ─── Material ───────────────────────────────────────────────────
//
// A material defines how the surface of a mesh looks when rendered.
//
// MeshNormalMaterial is great for debugging and learning. It colors
// each face based on which direction its surface normal points:
//   - Faces pointing toward +X → red
//   - Faces pointing toward +Y → green
//   - Faces pointing toward +Z → blue
//   - Blends of these for angled faces (purples, cyans, yellows)
//
// No lights needed — the colors come purely from the geometry.
//
// 'flatShading: true' computes one normal per triangle face, giving
// the faceted/low-poly look. Set to false (default) for smooth shading.
//
// Other materials to try:
//   MeshBasicMaterial({ color: 0xff0000 }) — solid color, no shading
//   MeshStandardMaterial({ color: 0xff0000 }) — realistic PBR (needs lights)
//   MeshPhongMaterial({ color: 0xff0000 }) — classic shiny surface (needs lights)

const material = new THREE.MeshNormalMaterial( { flatShading: true } );


// ─── Mesh ───────────────────────────────────────────────────────
//
// A Mesh combines a geometry (shape) and a material (surface) into
// a single object that can be placed in the scene.
//
// Every mesh has a position, rotation, and scale that you can change.
// By default, meshes are placed at the origin (0, 0, 0).

const cubeMesh = new THREE.Mesh( geometry, material );

// Add the mesh to the scene. Nothing is visible until you do this.
scene.add( cubeMesh );


// ─── Animation Loop ─────────────────────────────────────────────
//
// To create animation, we need to re-render the scene many times per
// second (typically 60 fps). Each frame, we update the scene slightly
// (e.g., rotate the cube) and then render.
//
// renderer.setAnimationLoop() is the recommended way to do this with
// WebGPURenderer. It calls our function every frame and handles
// timing automatically. (It's similar to requestAnimationFrame but
// also works correctly with WebGPU's async rendering.)
//
// We track time between frames (deltaTime) so the rotation speed
// stays consistent regardless of frame rate.

let time = Date.now();

renderer.setAnimationLoop( () => {

  // Calculate milliseconds since last frame
  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  // Rotate the cube around the Y axis (vertical axis).
  // 0.0005 radians per millisecond ≈ ~29 degrees per second.
  // Try rotateX() or rotateZ() for other axes.
  cubeMesh.rotateY( 0.0005 * deltaTime );

  // Draw the scene from the camera's point of view.
  // This must be called every frame to see the updated rotation.
  renderer.render( scene, camera );

} );
