/*

FBM / Ridged Noise Voxel Clouds

A 3D grid of boxes placed where noise exceeds a threshold, creating
volumetric cloud-like structures. Noise is evaluated on the CPU to
make placement decisions, then rendered with InstancedMesh.

Interior voxels (all 6 neighbors above threshold) are culled to save
draw calls — only the visible surface shell is rendered.

Switch between FBM and Ridged noise with NOISE_TYPE below.

@LukaPiskorec 2026

*/


( async () => {

const THREE = await import( 'three' );
const { OrbitControls } = await import( 'three/addons/controls/OrbitControls.js' );
const { createFBM, createRidgedNoise } = window.NoiseLib;


// ─── Configuration ────────────────────────────────────────────


// noise type: 'fbm' or 'ridged'
const NOISE_TYPE = 'fbm';

// noise layering parameters
const OCTAVES    = 6;      // number of noise layers
const LACUNARITY = 2.0;    // frequency multiplier per octave
const GAIN       = 0.5;    // amplitude multiplier per octave

// spatial frequency of the noise
const NOISE_SCALE = 0.5;

// noise value above which a box is placed
const THRESHOLD = 0.45;

// grid dimensions (GRID_SIZE × GRID_SIZE × GRID_SIZE)
const GRID_SIZE = 100;

// size of each cube
const BOX_SIZE = 0.1;


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
  45, window.innerWidth / window.innerHeight, 0.1, 1000
);
camera.position.set( 12, 8, 12 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();


// ─── Noise Evaluation ─────────────────────────────────────────


const noiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

const noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( noiseParams )
  : createFBM( noiseParams );

// precompute noise into a flat array for cache-friendly neighbor lookups
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


// ─── Surface Voxel Extraction ─────────────────────────────────


// helper: check if a cell is above threshold (out-of-bounds → false)
function isAbove( ix, iy, iz ) {

  if ( ix < 0 || ix >= GRID_SIZE ||
       iy < 0 || iy >= GRID_SIZE ||
       iz < 0 || iz >= GRID_SIZE ) return false;

  return noiseField[ ix + iy * GRID_SIZE + iz * GRID_SIZE * GRID_SIZE ] >= THRESHOLD;

}

// collect surface voxel positions (skip fully interior voxels)
const positions = [];
const halfExtent = ( GRID_SIZE * BOX_SIZE ) / 2;

for ( let iz = 0; iz < GRID_SIZE; iz++ ) {
  for ( let iy = 0; iy < GRID_SIZE; iy++ ) {
    for ( let ix = 0; ix < GRID_SIZE; ix++ ) {

      const idx = ix + iy * GRID_SIZE + iz * GRID_SIZE * GRID_SIZE;
      if ( noiseField[ idx ] < THRESHOLD ) continue;

      // skip interior: all 6 neighbors are also above threshold
      if ( isAbove( ix - 1, iy, iz ) &&
           isAbove( ix + 1, iy, iz ) &&
           isAbove( ix, iy - 1, iz ) &&
           isAbove( ix, iy + 1, iz ) &&
           isAbove( ix, iy, iz - 1 ) &&
           isAbove( ix, iy, iz + 1 ) ) continue;

      // center volume at origin
      positions.push(
        ix * BOX_SIZE - halfExtent,
        iy * BOX_SIZE - halfExtent,
        iz * BOX_SIZE - halfExtent
      );

    }
  }
}


// ─── Instanced Mesh ───────────────────────────────────────────


const instanceCount = positions.length / 3;
console.log( `Voxel cloud: ${ instanceCount } surface instances` );

const geometry = new THREE.BoxGeometry( BOX_SIZE, BOX_SIZE, BOX_SIZE );
const material = new THREE.MeshNormalMaterial( { flatShading: true } );
const mesh     = new THREE.InstancedMesh( geometry, material, instanceCount );

const matrix = new THREE.Matrix4();

for ( let i = 0; i < instanceCount; i++ ) {

  matrix.makeTranslation(
    positions[ i * 3     ],
    positions[ i * 3 + 1 ],
    positions[ i * 3 + 2 ]
  );
  mesh.setMatrixAt( i, matrix );

}

mesh.instanceMatrix.needsUpdate = true;
scene.add( mesh );


// ─── Render Loop ──────────────────────────────────────────────


  
let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;
  
  renderer.render( scene, camera );
  mesh.rotateY( 0.0001 * deltaTime );

} );

} )();
