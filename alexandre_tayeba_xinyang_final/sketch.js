/*
Retravailler code
Finir sphère
*/
import * as THREE from 'three';
import { Fn, uniform, float, vec3, positionLocal, normalLocal } from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const { createFBM, createRidgedNoise } = window.NoiseLib;

// ─── Noise Configuration ────────────────────────────────────────

// Plane noise
// noise type: 'fbm' or 'ridged'
const NOISE_TYPE = 'ridged';

// noise layering parameters (baked at shader compile time)
const OCTAVES    = 8;      // number of noise layers
const LACUNARITY = 4.0;    // frequency multiplier per octave
const GAIN       = 0.4;    // amplitude multiplier per octave
//(6, 2.0, 0.5)

// displacement
const NOISE_SCALE            = 0.5;   // spatial frequency of the noise
const DISPLACEMENT_STRENGTH  = 1.5;   // how far vertices are pushed

// animation — direction and speed of noise travel
const TRAVEL_DIRECTION = [ 1, 0, 0 ];  // axis of travel through noise field
const TRAVEL_SPEED     = 0.2;          // units per second

// Obelisk noise
const NOISE_TYPE_B            = 'ridged';
const OCTAVES_B               = 6;
const LACUNARITY_B            = 2.5;
const GAIN_B                  = 0.2;
const NOISE_SCALE_B           = 2.8;
const DISPLACEMENT_STRENGTH_B = 1.0;
const RADIUS_B                = 2.0;
const TRAVEL_DIRECTION_B      = [ 1, 1.5, 0.5 ];
const TRAVEL_SPEED_B          = 0.4;

// Sphere noise
const NOISE_TYPE_A            = 'ridged';
const OCTAVES_A               = 6;
const LACUNARITY_A            = 2.5;
const GAIN_A                  = -2;
const NOISE_SCALE_A           = 0.8;
const DISPLACEMENT_STRENGTH_A = 1.0;
const RADIUS_A                = 2.0;
const TRAVEL_DIRECTION_A      = [ 1, 0, 0 ];
const TRAVEL_SPEED_A          = 0.004;
const DETAIL = 30;

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

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

//Help
const axesHelper = new THREE.AxesHelper( 6 );
scene.add( axesHelper );

// ─── Noise Displacement ───────────────────────────────────────

//Plane Noise
const PlanenoiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

const noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( PlanenoiseParams )
  : createFBM( PlanenoiseParams );

const uTime = uniform( 0.0 );
const travelDir = vec3( TRAVEL_DIRECTION[ 0 ], TRAVEL_DIRECTION[ 1 ], TRAVEL_DIRECTION[ 2 ] );

// vertex displacement: push each vertex along its normal by noise value
const NoisePlane = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( NOISE_SCALE ).add( travelDir.mul( uTime ) );
  const noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();

const NoisePlanet = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( NOISE_SCALE ).add( travelDir.mul( uTime ) );
  const noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();

//Obelisk noise
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
// Spiky Sphere noise
const uTimeB = uniform( 0.0 );

const displacementB = makeDisplacement(
  NOISE_TYPE_B,
  { octaves: OCTAVES_B, lacunarity: LACUNARITY_B, gain: GAIN_B },
  NOISE_SCALE_B, DISPLACEMENT_STRENGTH_B, TRAVEL_DIRECTION_B, uTimeB
);

// Lights
const directionalLight = new THREE.DirectionalLight( 0xffffff, 3 );
const directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.2 );
const directionalLight3 = new THREE.DirectionalLight( 0xffffff, 0 );
directionalLight.position.set(0,7,6);
directionalLight2.position.set(0,-7,-7);
scene.add( directionalLight );
scene.add( directionalLight2 );

// ─── Geometry & Material ──────────────────────────────────────

// Dragon Serpent curve
class CustomSinCurve extends THREE.Curve {
	getPoint( t = 0.2, optionalTarget = new THREE.Vector3() ) {
		const tx = t * 16 - 1.5;
		const ty = Math.sin( 2 * Math.PI * t );
		const tz = 0;
		return optionalTarget.set( tx, ty, tz );
	}
}
const path = new CustomSinCurve( 2 );

// Spiky Sphere
const uTimeA = uniform( 0.0 );

const displacementA = makeDisplacement(
  NOISE_TYPE_A,
  { octaves: OCTAVES_A, lacunarity: LACUNARITY_A, gain: GAIN_A },
  NOISE_SCALE_A, DISPLACEMENT_STRENGTH_A, TRAVEL_DIRECTION_A, uTimeA
);

// Geometries
const sphrRadius = 0.8
const plane = new THREE.PlaneGeometry( 30, 30, 500, 500 );
const sphre = new THREE.IcosahedronGeometry( sphrRadius, 10);
const sphre2 = new THREE.OctahedronGeometry( sphrRadius, 0);
const sphre3 = new THREE.OctahedronGeometry( sphrRadius, 1);
const sphre4 = new THREE.IcosahedronGeometry( sphrRadius, 0);
const box = new THREE.BoxGeometry( 1, 1, 1 );
const box2 = new THREE.BoxGeometry( 1, 0.12, 1.5 );
const star = new THREE.CircleGeometry(0.2, 0);
const obelisk = new THREE.CapsuleGeometry( 1, 4, 2, 500, 400);
const cone = new THREE.ConeGeometry(1, 3, 12, 3);
const tubeCone = new THREE.ConeGeometry(0.5, 1.3, 12, 4);
const tube = new THREE.TubeGeometry( path, 40, 0.35, 8, false );
const circle = new THREE.CircleGeometry(0.35, 8);
const island = new THREE.ConeGeometry(1, 1, 12, 4, false);
const materialobelisk = new THREE.MeshNormalMaterial( { flatShading: false, side: THREE.DoubleSide } );
const SpkySphr = new THREE.IcosahedronGeometry( RADIUS_A, DETAIL );

// Materials
const materialplane = new THREE.MeshPhysicalMaterial( { side: THREE.DoubleSide, wireframe: true, color: 0x219ebc, reflectivity: 1 } );
const materialsphre = new THREE.MeshPhysicalMaterial( { color: 0x001845 } );
const materialsphre2 = new THREE.MeshPhysicalMaterial( { color: 0xffba08 } );
const materialsphre3 = new THREE.MeshPhysicalMaterial( { color: 0xd00000 } );
const materialsphre4 = new THREE.MeshPhysicalMaterial( { color: 0xe85d04} );
const materialbox = new THREE.MeshPhysicalMaterial( { color: 0x452d04} );
const materialstar = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, color: 0xC9C9C8 });
//const materialobelisk = new THREE.MeshNormalMaterial({ flatShading: true });
const materialcone = new THREE.MeshNormalMaterial({ flatShading: true });
const materialcone2 = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide, color: 0x4449AF });
const materialtube = new THREE.MeshPhysicalMaterial( {side: THREE.DoubleSide, color: 0x101460 } );
const materialisland = new THREE.MeshPhysicalMaterial({side: THREE.DoubleSide, color: 0xE8E8E8});
const materialSpkySphrMesh = new THREE.MeshNormalMaterial( { flatShading: true } );
materialplane.positionNode = NoisePlane;
materialobelisk.positionNode = displacementB;
materialSpkySphrMesh.positionNode = displacementA;

//Meshes
const planeMesh = new THREE.Mesh( plane, materialplane );
const sphreMesh = new THREE.Mesh( sphre, materialsphre );
const sphreMesh2 = new THREE.Mesh( sphre2, materialsphre2 );
const sphreMesh3 = new THREE.Mesh( sphre3, materialsphre3 );
const sphreMesh4 = new THREE.Mesh( sphre4, materialsphre4 );
const boxMesh = new THREE.Mesh( box, materialbox );
const boxMesh2 = new THREE.Mesh( box2, materialbox );
const obeliskMesh = new THREE.Mesh( obelisk, materialobelisk );
const coneMesh = new THREE.Mesh(cone, materialcone);
const coneMesh2 = new THREE.Mesh(cone, materialcone);
const coneMesh3 = new THREE.Mesh(cone, materialcone);
const coneMesh4 = new THREE.Mesh(cone, materialcone);
const tubeconeMesh = new THREE.Mesh(tubeCone, materialcone2);
const tubeMesh = new THREE.Mesh( tube, materialtube );
const circleMesh = new THREE.Mesh( circle, materialtube );
const islandMesh = new THREE.Mesh(island, materialisland);
const islandMesh2 = new THREE.Mesh(island, materialisland);
const islandMesh3 = new THREE.Mesh(island, materialisland);
const SpkySphrMesh = new THREE.Mesh( SpkySphr, materialSpkySphrMesh );


//Rotations and other manipulations
planeMesh.rotation.x = -Math.PI / 2;
sphreMesh.position.set(5.5, 3, 4);
sphreMesh2.position.set(9, 2, -3);
sphreMesh3.position.set(-3, 2, 7);
sphreMesh4.position.set(-1, 5, -6.5);
boxMesh.position.set(-6, 3, 1.5);
boxMesh2.position.set(4, 2, -2.5);
boxMesh2.rotateZ(0.3);
boxMesh2.rotateY(0.3);
obeliskMesh.position.set(0, 2.3, 0);
coneMesh.position.set(14.5,1,14.5);
coneMesh2.position.set(14.5,1,-14.5);
coneMesh3.position.set(-14.5,1,-14.5);
coneMesh4.position.set(-14.5,1,14.5);
tubeMesh.position.set(-2.5, 0, 9.5);
circleMesh.position.set(12, 0, 9.5);
circleMesh.rotateY(1.6);
circleMesh.rotateX(-0.4);
tubeconeMesh.position.set(-4.5,-0.27,9.5);
tubeconeMesh.rotateZ(-4.28);
islandMesh.position.set(-2, 3, -3);
islandMesh.rotateZ(3.13);
islandMesh2.position.set(2, 5, 3);
islandMesh2.rotateZ(3.13);
islandMesh3.position.set(-2.4, 2, 4);
islandMesh3.rotateZ(3.13);
SpkySphrMesh.position.set(0, 8.5, 0);


//Additions to the scene
scene.add( planeMesh );
scene.add( sphreMesh );
scene.add( sphreMesh2 );
scene.add( sphreMesh3 );
scene.add( sphreMesh4 );
scene.add( boxMesh );
scene.add( boxMesh2 );
scene.add( obeliskMesh );
scene.add( coneMesh );
scene.add( coneMesh2 );
scene.add( coneMesh3 );
scene.add( coneMesh4 );
scene.add( tubeMesh );
scene.add( circleMesh );
scene.add( tubeconeMesh );
scene.add( islandMesh );
scene.add( islandMesh2 );
scene.add( islandMesh3 );
scene.add( SpkySphrMesh );

//Stars
const starnmb = 160;
const spread = 80;
const starmeshes = [];

for ( let i = 0; i < starnmb; i++ ) {

  const stars = new THREE.Mesh( star, materialstar );
  stars.position.set(
    ( Math.random() - 0.5 ) * spread,
    ( Math.random() - 0.5 ) * spread,
    ( Math.random() - 0.5 ) * spread
  );
  stars.rotateY(Math.random() - 0.8);
  stars.rotateX(Math.random() - 0.8);
  scene.add( stars );
  starmeshes.push( stars );
}
// ─── Animation Loop ───────────────────────────────────────────

let time = Date.now();

renderer.setAnimationLoop( () => {

  const currentTime = Date.now();
  const deltaTime   = currentTime - time;
  time = currentTime;
  
  boxMesh.rotateY( 0.0005 * deltaTime );
  boxMesh.rotateX( 0.0005 * deltaTime );
  
  uTime.value += deltaTime * 0.001 * TRAVEL_SPEED;

  const dt = deltaTime * 0.001;
  uTimeB.value += dt * TRAVEL_SPEED_B;
  uTimeA.value += dt * TRAVEL_SPEED_A;
  
  renderer.render( scene, camera );
});