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
const { createFBM, createRidgedNoise, createCpuFBM, createCpuRidgedNoise } = window.NoiseLib;


// ─── Configuration ────────────────────────────────────────────


// noise type: 'fbm' or 'ridged'
const NOISE_TYPE = 'ridged';

// noise layering parameters (baked at shader compile time)
const OCTAVES    = 6;      // number of noise layers
const LACUNARITY = 2.0;    // frequency multiplier per octave
const GAIN       = 0.5;    // amplitude multiplier per octave

// displacement
const NOISE_SCALE            = 25;   // spatial frequency of the noise
const DISPLACEMENT_STRENGTH  = 10;   // how far vertices are pushed

// animation — direction and speed of noise travel
const TRAVEL_DIRECTION = [ 10, 10, 10 ];  // axis of travel through noise field
const TRAVEL_SPEED     = 0.2;          // units per second


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
camera.position.set( 0, 50, 50 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─── Noise Displacement ───────────────────────────────────────


const noiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

const noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( noiseParams )
  : createFBM( noiseParams );

const uTime = uniform( 0.0 );
const travelDir = vec3( TRAVEL_DIRECTION[ 0 ], TRAVEL_DIRECTION[ 1 ], TRAVEL_DIRECTION[ 2 ] );

// vertex displacement: push each vertex along its normal by noise value
const displacedPosition = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( NOISE_SCALE ).add( travelDir.mul( uTime ) );
  const noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────

function Monstre(x,y,z){
//const geometry = new THREE.TorusKnotGeometry( 10, 3, 1000, 100,6,8 );
const geometry_A = new THREE.TorusKnotGeometry( 20, 2, 1000, 100,11,5 );


const material_A = new THREE.MeshStandardMaterial( { flatShading: true, side: THREE.DoubleSide } );
material_A.positionNode = displacedPosition;

const mesh_A = new THREE.Mesh( geometry_A, material_A );

mesh_A.rotation.x = -Math.PI / 2;
scene.add( mesh_A );
// ─── Geometry & Material 2 ──────────────────────────────────────


class CustomSinCurve extends THREE.Curve {
	getPoint( t, optionalTarget = new THREE.Vector3() ) {
		const tx = t * 3 - 1.5;
		const ty = Math.sin( 2 * Math.PI * t );
		const tz = 0;
		return optionalTarget.set( tx, ty, tz );
	}
}
const path = new CustomSinCurve( 1 );
const geometry_B = new THREE.TubeGeometry( path, 100, 0.2, 32, false );
//const material = new THREE.MeshBasicMaterial( { color: 0x00ff00, side: THREE.DoubleSided } );
const material_B = new THREE.MeshStandardMaterial( { color: 0xffffff, flatShading: true, side: THREE.DoubleSide } );
const mesh_B = new THREE.Mesh( geometry_B, material_B );
mesh_B.scale.set(20, 20 , 20);
mesh_B.rotation.z = Math.PI / -6;
mesh_B.position.y += 20;
scene.add( mesh_B );

// ─── Geometry & Material 3 ──────────────────────────────────────

const geometry3 = new THREE.SphereGeometry( 15, 32, 16 );
const material3 = new THREE.MeshStandardMaterial( { color: 0xffff00 } );
const sphere1 = new THREE.Mesh( geometry3, material3 );
scene.add( sphere1 );
sphere1.position.y += 35;
sphere1.position.x -= 20;
const geometry4 = new THREE.SphereGeometry( 15, 32, 16 );
const material4 = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const sphere2 = new THREE.Mesh( geometry4, material4 );
scene.add( sphere2 );
sphere2.position.y += 35;
sphere2.position.x -= 30;
sphere2.position.z -= 5;
const geometry5 = new THREE.SphereGeometry( 15, 32, 16 );
const material5 = new THREE.MeshBasicMaterial( { color: 0xffff00 } );
const sphere3 = new THREE.Mesh( geometry5, material5 );
scene.add( sphere3 );
sphere3.position.y += 35;
sphere3.position.x -= 30;
sphere3.position.z += 5;
sphere1.scale.set(0.75,0.75,0.75);
sphere2.scale.set(0.2,0.2,0.2);
sphere3.scale.set(0.2,0.2,0.2);
  
mesh_A.position.x +=x;
mesh_A.position.y +=y;
mesh_A.position.z +=z;
mesh_B.position.x +=x;
mesh_B.position.y +=y;
mesh_B.position.z +=z;
sphere1.position.x +=x;
sphere1.position.y +=y;
sphere1.position.z +=z;
sphere2.position.x +=x;
sphere2.position.y +=y;
sphere2.position.z +=z;
sphere3.position.x +=x;
sphere3.position.y +=y;
sphere3.position.z += z;
}
Monstre(25,0,100);
Monstre(0,0,0);
Monstre(25,0,-100);
const geometry = new THREE.PlaneGeometry( 10000, 10000, 1000, 1000 );

const material = new THREE.MeshStandardMaterial( { color: 0xffffff, flatShading: true, side: THREE.DoubleSide } );
material.positionNode = displacedPosition;

const mesh = new THREE.Mesh( geometry, material );
mesh.rotation.x = -Math.PI / 2;
scene.add( mesh );

// ─── Light ──────────────────────────────────────

const directionalLight_A = new THREE.DirectionalLight( 0x0000ff, 0.5 );
const directionalLight_B = new THREE.DirectionalLight( 0xff0000, 1.5 );

directionalLight_A.position.set( 0,10,0);
directionalLight_B.position.set( 0,-10,0);
scene.add( directionalLight_A );
scene.add( directionalLight_B );


// ─── Voxel Cubes ─────────────────────────────────────────────


const VOXEL_GRID_SIZE    = 10;
const VOXEL_BOX_SIZE     = 0.5;
const VOXEL_NOISE_SCALE  = 0.5;
const VOXEL_THRESHOLD    = 0.45;
const VOXEL_COUNT        = 5;     // number of cubes
const VOXEL_SPACING      = 15;    // X offset between cubes
const VOXEL_ORIGIN       = [ 0, 0, 0 ];  // position of the first cube

const cpuNoiseFn = NOISE_TYPE === 'ridged'
  ? createCpuRidgedNoise( noiseParams )
  : createCpuFBM( noiseParams );

for ( let c = 0; c < VOXEL_COUNT; c++ ) {

  // evaluate noise field
  const noiseField = new Float32Array( VOXEL_GRID_SIZE * VOXEL_GRID_SIZE * VOXEL_GRID_SIZE );

  for ( let iz = 0; iz < VOXEL_GRID_SIZE; iz++ ) {
    for ( let iy = 0; iy < VOXEL_GRID_SIZE; iy++ ) {
      for ( let ix = 0; ix < VOXEL_GRID_SIZE; ix++ ) {
        const idx = ix + iy * VOXEL_GRID_SIZE + iz * VOXEL_GRID_SIZE * VOXEL_GRID_SIZE;
        // offset noise sampling per cube so each looks different
        noiseField[ idx ] = cpuNoiseFn(
          ( ix + c * VOXEL_GRID_SIZE ) * VOXEL_NOISE_SCALE,
          iy * VOXEL_NOISE_SCALE,
          iz * VOXEL_NOISE_SCALE
        );
      }
    }
  }

  // extract surface voxels
  function isAbove( ix, iy, iz ) {
    if ( ix < 0 || ix >= VOXEL_GRID_SIZE ||
         iy < 0 || iy >= VOXEL_GRID_SIZE ||
         iz < 0 || iz >= VOXEL_GRID_SIZE ) return false;
    return noiseField[ ix + iy * VOXEL_GRID_SIZE + iz * VOXEL_GRID_SIZE * VOXEL_GRID_SIZE ] >= VOXEL_THRESHOLD;
  }

  const voxelPositions = [];
  const halfExtent = ( VOXEL_GRID_SIZE * VOXEL_BOX_SIZE ) / 2;

  for ( let iz = 0; iz < VOXEL_GRID_SIZE; iz++ ) {
    for ( let iy = 0; iy < VOXEL_GRID_SIZE; iy++ ) {
      for ( let ix = 0; ix < VOXEL_GRID_SIZE; ix++ ) {
        const idx = ix + iy * VOXEL_GRID_SIZE + iz * VOXEL_GRID_SIZE * VOXEL_GRID_SIZE;
        if ( noiseField[ idx ] < VOXEL_THRESHOLD ) continue;

        if ( isAbove( ix - 1, iy, iz ) &&
             isAbove( ix + 1, iy, iz ) &&
             isAbove( ix, iy - 1, iz ) &&
             isAbove( ix, iy + 1, iz ) &&
             isAbove( ix, iy, iz - 1 ) &&
             isAbove( ix, iy, iz + 1 ) ) continue;

        voxelPositions.push(
          ix * VOXEL_BOX_SIZE - halfExtent,
          iy * VOXEL_BOX_SIZE - halfExtent,
          iz * VOXEL_BOX_SIZE - halfExtent
        );
      }
    }
  }

  // create instanced mesh
  const instanceCount = voxelPositions.length / 3;
  if ( instanceCount === 0 ) continue;

  const voxelGeometry = new THREE.BoxGeometry( VOXEL_BOX_SIZE, VOXEL_BOX_SIZE, VOXEL_BOX_SIZE );
  const voxelMaterial = new THREE.MeshNormalMaterial( { flatShading: true } );
  const voxelMesh     = new THREE.InstancedMesh( voxelGeometry, voxelMaterial, instanceCount );

  const voxelMatrix = new THREE.Matrix4();
  for ( let i = 0; i < instanceCount; i++ ) {
    voxelMatrix.makeTranslation(
      voxelPositions[ i * 3     ],
      voxelPositions[ i * 3 + 1 ],
      voxelPositions[ i * 3 + 2 ]
    );
    voxelMesh.setMatrixAt( i, voxelMatrix );
  }

  voxelMesh.instanceMatrix.needsUpdate = true;
  voxelMesh.position.set(
    VOXEL_ORIGIN[ 0 ] + c * VOXEL_SPACING,
    VOXEL_ORIGIN[ 1 ],
    VOXEL_ORIGIN[ 2 ]
  );
  scene.add( voxelMesh );

}


// ─── Animation Loop ───────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime   = currentTime - time;
  time = currentTime;

  uTime.value += deltaTime * 0.001 * TRAVEL_SPEED;
  renderer.render( scene, camera );

} );
