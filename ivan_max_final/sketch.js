/*

Ivan + Max 01

Voxel planet sphere (FBM/Ridged noise) surrounded by blobby
noise-displaced capsule asteroids.

@LukaPiskorec 2026

*/


import * as THREE from 'three';
import { Fn, uniform, vec3, positionLocal, normalLocal } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const { createFBM, createRidgedNoise, perlinNoise3D } = window.NoiseLib;


// ─── Configuration: Voxel Planet ─────────────────────────────


// noise type: 'fbm' or 'ridged'
const NOISE_TYPE = 'fbm';

// noise layering parameters
const OCTAVES    = 6;
const LACUNARITY = 2.0;
const GAIN       = 0.5;

// spatial frequency of the noise
const NOISE_SCALE = 0.01;

// noise value above which a box is placed
const THRESHOLD = 0.45;

// grid dimensions (GRID_SIZE × GRID_SIZE × GRID_SIZE)
const GRID_SIZE = 100;

// size of each cube
const BOX_SIZE = 0.2;


// ─── Configuration: Asteroids ────────────────────────────────


const ASTEROID_COUNT = 390;
const SPREAD = 11;
const ROTATION_SPEED = 0.0025;
const MIN_ROT_SPEED = 0.0002;

const uTime = uniform( 5.0 );
const ASTEROID_NOISE_SCALE = 3.0;
const DISPLACEMENT_STRENGTH = 0.9;


// ─── Renderer & Scene ────────────────────────────────────────


const renderer = new THREE.WebGPURenderer( {
  canvas: document.querySelector( '#canvas' ),
  antialias: true,
} );
renderer.setSize( window.innerWidth, window.innerHeight );
await renderer.init();

const scene = new THREE.Scene();
scene.background = new THREE.Color( 0x000000 );

const camera = new THREE.PerspectiveCamera(
  45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set( 12, 8, 12 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─── Voxel Planet: Noise Evaluation ──────────────────────────


const noiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

const noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( noiseParams )
  : createFBM( noiseParams );

const noiseField = new Float32Array( GRID_SIZE * GRID_SIZE * GRID_SIZE );

for ( let iz = 0; iz < GRID_SIZE; iz++ ) {
  for ( let iy = 0; iy < GRID_SIZE; iy++ ) {
    for ( let ix = 0; ix < GRID_SIZE; ix++ ) {

      const idx = ix + iy * GRID_SIZE + iz * GRID_SIZE * GRID_SIZE;
      noiseField[ idx ] = noiseFn(
        ix * NOISE_SCALE,
        iy * NOISE_SCALE,
        iz * NOISE_SCALE
      );

    }
  }
}

//light
// White directional light at half intensity shining from the top.

const directionalLight = new THREE.DirectionalLight( 0xfffff, 0,7 );
directionalLight.position.set(0, 0, -25)
scene.add( directionalLight );

const light = new THREE.PointLight( 0xAE0404, 1000, 100 );
light.position.set( 0, 0, -5 );
scene.add( light );

const light2 = new THREE.PointLight( 0xff0000, 1000, 10 );
light.position.set( 0, 0, 5);
scene.add( light2 );

const directionalLight2 = new THREE.DirectionalLight( 0xAE0404, 0.11,11 );
directionalLight.position.set(0, 0, -25)
scene.add( directionalLight2 );

/*------------------------------------------------------------------------------
Retourne l'image d'un point par une rotation (repère X de gauche à droite, Y du
haut vers le bas).
ENTREE :
    M        Point à transformer
    O        Point centre de la rotation
    angle    Angle (en degrés)
SORTIE :
    Image de M par la rotation d'angle angle autour de O (les coordonnées ne
    sont pas entières).
------------------------------------------------------------------------------*/
/*function rotate (M, O, angle) {
    var xM, yM, x, y;
    angle *= Math.PI / 180;
    xM = M.x - O.x;
    yM = M.y - O.y;
    x = xM * Math.cos (angle) + yM * Math.sin (angle) + O.x;
    y = - xM * Math.sin (angle) + yM * Math.cos (angle) + O.y;
    return ({x:Math.round (x), y:Math.round (y)}); 
}*/


// ─── Voxel Planet: Surface Extraction ────────────────────────


const positions = [];
const halfExtent = ( GRID_SIZE * BOX_SIZE ) / 2;
const halfGrid   = GRID_SIZE / 2;
const radiusSq   = halfGrid * halfGrid;

// a voxel is "solid" only if it passes both the noise threshold AND
// the sphere clip — so neighbors outside the sphere count as empty,
// keeping the sphere boundary visible after interior culling
function isSolid( ix, iy, iz ) {

  if ( ix < 0 || ix >= GRID_SIZE ||
       iy < 0 || iy >= GRID_SIZE ||
       iz < 0 || iz >= GRID_SIZE ) return false;

  const dx = ix - halfGrid;
  const dy = iy - halfGrid;
  const dz = iz - halfGrid;
  if ( dx * dx + dy * dy + dz * dz > radiusSq ) return false;

  return noiseField[ ix + iy * GRID_SIZE + iz * GRID_SIZE * GRID_SIZE ] >= THRESHOLD;

}

for ( let iz = 0; iz < GRID_SIZE; iz++ ) {
  for ( let iy = 0; iy < GRID_SIZE; iy++ ) {
    for ( let ix = 0; ix < GRID_SIZE; ix++ ) {

      if ( ! isSolid( ix, iy, iz ) ) continue;

      // skip interior: all 6 neighbors are also solid
      if ( isSolid( ix - 1, iy, iz ) &&
           isSolid( ix + 1, iy, iz ) &&
           isSolid( ix, iy - 1, iz ) &&
           isSolid( ix, iy + 1, iz ) &&
           isSolid( ix, iy, iz - 1 ) &&
           isSolid( ix, iy, iz + 1 ) ) continue;

      positions.push(
        ix * BOX_SIZE - halfExtent,
        iy * BOX_SIZE - halfExtent,
        iz * BOX_SIZE - halfExtent
      );

    }
  }
}


// ─── Voxel Planet: Instanced Mesh ────────────────────────────

const instanceCount = positions.length / 3;
console.log( `Voxel planet: ${ instanceCount } surface instances` );

const voxelGeometry = new THREE.BoxGeometry( BOX_SIZE, BOX_SIZE, BOX_SIZE );
const voxelMaterial = new THREE.MeshPhysicalMaterial( { flatShading: false } );
const voxelMesh     = new THREE.InstancedMesh( voxelGeometry, voxelMaterial, instanceCount );

const matrix = new THREE.Matrix4();

for ( let i = 0; i < instanceCount; i++ ) {

  matrix.makeTranslation(
    positions[ i * 3     ],
    positions[ i * 3 + 1 ],
    positions[ i * 3 + 2 ]
  );
  voxelMesh.setMatrixAt( i, matrix );

}

voxelMesh.instanceMatrix.needsUpdate = true;
scene.add( voxelMesh );


// ─── Asteroids: TSL Displacement Node ────────────────────────


const displacedPosition = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( ASTEROID_NOISE_SCALE ).add( vec3( 0.0, 0.0, uTime ) );
  const noiseVal = perlinNoise3D( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Asteroids: Create & Scatter ─────────────────────────────


const asteroidGeometry = new THREE.CapsuleGeometry( 1, 1, 4, 8, 1 );
const asteroidMaterial = new THREE.MeshPhysicalMaterial( { color: 0x01110A, flatShading: false,
                                                          
roughness: 0.262, 
metalness: 0.4 
});
asteroidMaterial.positionNode = displacedPosition;
const asteroids = [];
const rotAxes = [];
const rotSpeeds = [];

for ( let i = 0; i < ASTEROID_COUNT; i++ ) {

  const asteroidMesh = new THREE.Mesh( asteroidGeometry, asteroidMaterial );
  asteroidMesh.position.set(
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD
  );
  scene.add( asteroidMesh );
  asteroids.push( asteroidMesh );

  const axis = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  rotAxes.push( axis );

  rotSpeeds.push( Math.random() );

}


// ─── Animation Loop ──────────────────────────────────────────


let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  // rotate voxel planet
  voxelMesh.rotateY( 0.0001 * deltaTime );

  // rotate each asteroid on its random axis
  for ( let i = 0; i < ASTEROID_COUNT; i++ ) {
    asteroids[ i ].rotateOnAxis( rotAxes[ i ], rotSpeeds[ i ] * ROTATION_SPEED * deltaTime + MIN_ROT_SPEED );
  }

  // animate asteroid noise displacement
  uTime.value += deltaTime * 0.002;


  renderer.render( scene, camera );
 

} );
