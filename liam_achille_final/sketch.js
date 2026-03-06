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
import {
  Fn, uniform, float, vec3,
  positionLocal, normalLocal,
  floor, fract, sin, cos, dot, mix
} from 'three/tsl';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
const { createFBM, createRidgedNoise } = window.NoiseLib;
//import * as reflector from "reflector.module.js"


// ─── Configuration ────────────────────────────────────────────


const domainWarp = Fn(([ p ]) => {
  const q = vec2(
    simplexNoise(p),
    simplexNoise(p.add(vec2(5.2, 1.3)))
  );

  const r = vec2(
    simplexNoise(p.add(q.mul(uWarpStrength)).add(vec2(1.7, 9.2))),
    simplexNoise(p.add(q.mul(uWarpStrength)).add(vec2(8.3, 2.8)))
  );

  return simplexNoise(p.add(r.mul(0.5)));
});






// noise type: 'fbm' or 'ridged'
var NOISE_TYPE = 'fbm';

// noise layering parameters (baked at shader compile time)
var OCTAVES    = 3;      // number of noise layers
var LACUNARITY = 2.0;    // frequency multiplier per octave
var GAIN       = 0.7;    // amplitude multiplier per octave

// displacement
var NOISE_SCALE            = 1;   // spatial frequency of the noise
var DISPLACEMENT_STRENGTH  = 15;   // how far vertices are pushed

// animation — direction and speed of noise travel
var TRAVEL_DIRECTION = [ 1, 0, 0 ];  // axis of travel through noise field
var TRAVEL_SPEED     = 0.1;          // units per second


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
  45, window.innerWidth / window.innerHeight, 1, 2000
);
camera.position.set( 600, 8, 8 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );


// ─── Noise Displacement ───────────────────────────────────────


var noiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

var noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( noiseParams )
  : createFBM( noiseParams );

var uTime = uniform( 0.0 );
var travelDir = vec3( TRAVEL_DIRECTION[ 0 ], TRAVEL_DIRECTION[ 1 ], TRAVEL_DIRECTION[ 2 ] );

// vertex displacement: push each vertex along its normal by noise value
var displacedPosition = Fn( () => {

  var pos = positionLocal.toVar();
  var nrm = normalLocal.toVar();

  var noiseInput = pos.mul( NOISE_SCALE ).add( travelDir.mul( uTime ) );
  var noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────

const sun = new THREE.TextureLoader().load('./istockphoto-1156217558-170667a.jpg')
const glitched = new THREE.TextureLoader().load('./mm/téléchargement (1).jpeg')
const uvtest = new THREE.TextureLoader().load('./mm/téléchargement.jpeg')


//               lightning
let intensité = 10000
const light1 = new THREE.PointLight( 0xffffff, intensité, 0 );
light1.position.set( 30, 30, 0 );
scene.add( light1);
const light2 = new THREE.PointLight( 0xffffff, intensité, 0 );
light2.position.set( 30, -30, 0 );
scene.add( light2);
const light3 = new THREE.PointLight( 0xffffff, intensité, 0 );
light3.position.set( 30, -30, -30 );
scene.add( light3);
const light4 = new THREE.PointLight( 0xffffff, intensité, 0 );
light4.position.set( -30,30, 30 );
scene.add( light4);
const light5 = new THREE.PointLight( 0xffffff, intensité, 0 );
light5.position.set( -30,-30, -30 );
scene.add( light5);
const light6 = new THREE.PointLight( 0xffffff, intensité, 0 );
light6.position.set( 30,30, -45 );
scene.add( light6);
const light7 = new THREE.PointLight( 0xffffff, intensité, 0 );
light7.position.set( 30,-30, 30 );
scene.add( light7);




const lighting = new THREE.AmbientLight( 0x404040 ); // soft white light
scene.add( lighting );

//                §§§§§§§§§§§§§§  le soleil

const geometry = new THREE.IcosahedronGeometry( 15, 50 );
//const geometry = new THREE.PlaneGeometry( 10, 10, 100, 100 );


const material = new THREE.MeshStandardMaterial({ color: 0xffffff ,map:sun });
//const material = new THREE.MeshNormalMaterial( { flatShading: true, side: THREE.DoubleSide} );
material.positionNode = displacedPosition;


const mesh = new THREE.Mesh( geometry, material );
mesh.rotation.x = -Math.PI / 2;

scene.add( mesh );




















































//             §§§§§§§§§§§§§.     la black and white



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




// ─── Noise Displacement ───────────────────────────────────────


const uTime1 = uniform( 0.0 );
const noiseScale1 = 2.0;
const displacementStrength1 = 0.6;

const displacedPosition1 = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  // sample 3D noise at scaled position, animate by scrolling through Z
  const noiseInput = pos.mul( noiseScale1 ).add( vec3( 0.0, 0.0, uTime1 ) );
  const noiseVal = perlinNoise3D( noiseInput ).sub( 0.5 ).mul( displacementStrength1 );

  // push vertex outward/inward along its normal
  return pos.add( nrm.mul( noiseVal ) );

} )();






// ─── Geometry & Material ──────────────────────────────────────


const geometry2 = new THREE.IcosahedronGeometry( 15, 50 );

const material2 = new THREE.MeshStandardMaterial({ color: 0xffffff , flatShading :true});
material2.positionNode = displacedPosition1
//material2.positionNode = mix(displacedPosition1,displacedPosition,domainWarp)



const mesh2 = new THREE.Mesh( geometry2, material2 );
//mesh2.MeshPhysicalMaterial.reflectivity.set(2)
mesh2.position.set(0,0,180)
scene.add( mesh2 );



//                      §§§§§§§§§§§§§ water





const geometrywater = new THREE.IcosahedronGeometry( 15, 50 );

const materialwater = new THREE.MeshStandardMaterial({ color: 0xffffff ,flatShading :true,map:uvtest });
materialwater.positionNode = displacedPosition1
//material2.positionNode = mix(displacedPosition1,displacedPosition,domainWarp)



const meshwater = new THREE.Mesh( geometrywater, materialwater);
//mesh2.MeshPhysicalMaterial.reflectivity.set(2)
meshwater.position.set(100,0,0)
scene.add( meshwater );





//                      §§§§§§§§§§§§§ glitched





const geometryglitched = new THREE.IcosahedronGeometry( 15, 50 );

const materialglitched = new THREE.MeshStandardMaterial({ color: 0xffffff ,map:glitched });
materialglitched.positionNode = displacedPosition
//material2.positionNode = mix(displacedPosition1,displacedPosition,domainWarp)



const meshglitched = new THREE.Mesh( geometryglitched, materialglitched);
//mesh2.MeshPhysicalMaterial.reflectivity.set(2)
var glity =   0
var glitx =   0
var glitz =  -150
meshglitched.position.set(glity,glitx,glitz)
scene.add( meshglitched );










//              §§§§§§§§§§§§§§§§.   la planète naine

const geometrysea = new THREE.IcosahedronGeometry( 2, 50 );
//const geometry = new THREE.PlaneGeometry( 10, 10, 100, 100 );

const materialsea = new THREE.MeshBasicMaterial({ color: 0x000000  });
//materialsea.positionNode = displacedPosition;
materialsea.positionNode = displacedPosition1

const meshsea = new THREE.Mesh( geometrysea, materialsea );
meshsea.rotation.x = -Math.PI / 2;
scene.add( meshsea );

// White directional light at half intensity shining from the top.
//const directionalLight = new THREE.DirectionalLight( 0xffffff, 10 );
//scene.add( directionalLight );























const randomGradient3D3 = Fn( ( [ p ] ) => {

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

const perlinNoise3D3 = Fn( ( [ p ] ) => {

  const i = floor( p ).toVar();
  const f = fract( p ).toVar();

  // smoothstep: 3f² − 2f³
  const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

  // gradients at 8 cube corners
  const g000 = randomGradient3D3( i );
  const g100 = randomGradient3D3( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const g010 = randomGradient3D3( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const g110 = randomGradient3D3( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const g001 = randomGradient3D3( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const g101 = randomGradient3D3( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const g011 = randomGradient3D3( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const g111 = randomGradient3D3( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

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




// ─── Noise Displacement ───────────────────────────────────────



const noiseScale = 0.2;
const displacementStrength = 0.6;
const displacedPosition2 = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  // sample 3D noise at scaled position, animate by scrolling through Z
  const noiseInput = pos.mul( noiseScale ).add( vec3( 0.0, 0.0, uTime ) );
  const noiseVal = perlinNoise3D3( noiseInput ).sub( 0.5 ).mul( displacementStrength );

  // push vertex outward/inward along its normal
  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────

// White directional light at half intensity shining from the top.
var BOX_COUNT = 60;
//const directionalLight2 = new THREE.DirectionalLight( 0xffffff, 2 );
//scene.add( directionalLight2 );
const geometry3 = new THREE.CapsuleGeometry( 1, 0.02, 8, 32 );
const material3 = new THREE.MeshLambertMaterial()
material3.positionNode = displacedPosition2
const mesh3 = new THREE.Mesh( geometry3, material3 );


// create all meshes, assign random positions, and add to scene
var SPREAD = 1000
const meshes = [];

const mesh2348 = new THREE.Mesh( geometry3, material2 );
scene.add(mesh2348)
mesh2348.position.set(0,0,590)
for ( let i = 0; i < BOX_COUNT; i++ ) {

  const mesh = new THREE.Mesh( geometry3, material3 );
  mesh.position.set(
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD
  );
  scene.add( mesh );
  meshes.push( mesh );
}
BOX_COUNT = 20;
SPREAD = 300
const geometry4 = new THREE.CapsuleGeometry( 3, 0.02, 8, 32 );
for ( let i = 0; i < BOX_COUNT; i++ ) {

  const mesh = new THREE.Mesh( geometry4, material3 );
  mesh.position.set(
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD,
    ( Math.random() - 0.5 ) * SPREAD
  );
  scene.add( mesh );
  meshes.push( mesh );
}





const NOISE_TYPE_A            = 'fbm';
const OCTAVES_A               = 3;
const LACUNARITY_A            = 2.0;
const GAIN_A                  = 0.5;
const NOISE_SCALE_A           = 0.5;
const DISPLACEMENT_STRENGTH_A = 1.5;
const RADIUS_A                = 2.25;
const TRAVEL_DIRECTION_A      = [ 0, 0, 1 ];
const TRAVEL_SPEED_A          = 0.3;


// ─── Planet B Configuration (wireframe, Ridged) ───────────────


const NOISE_TYPE_B            = 'ridged';
const OCTAVES_B               = 18;
const LACUNARITY_B            = 2.5;
const GAIN_B                  = 5.5;
const NOISE_SCALE_B           = 0.8;
const DISPLACEMENT_STRENGTH_B = 1.0;
const RADIUS_B                = 2.0;
const TRAVEL_DIRECTION_B      = [ 1, 0, 0 ];
const TRAVEL_SPEED_B          = 0.2;



// ─── Shared ───────────────────────────────────────────────────


const DETAIL = 30;  // icosahedron subdivision level










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

const geometryA = new THREE.IcosahedronGeometry( 16.875, DETAIL );
const materialA = new THREE.MeshNormalMaterial( { flatShading: true } );
materialA.positionNode = displacementA;

const meshA = new THREE.Mesh( geometryA, materialA );
meshA.position.set(50,0,-50)
scene.add( meshA );


// ─── Planet B (wireframe) ─────────────────────────────────────


const uTimeB = uniform( 0.0 );

const displacementB = makeDisplacement(
  NOISE_TYPE_B,
  { octaves: OCTAVES_B, lacunarity: LACUNARITY_B, gain: GAIN_B },
  NOISE_SCALE_B, DISPLACEMENT_STRENGTH_B, TRAVEL_DIRECTION_B, uTimeB
);

const geometryB = new THREE.IcosahedronGeometry( 15, DETAIL );
const materialB = new THREE.MeshNormalMaterial( { flatShading: true, side: THREE.DoubleSide } );
materialB.positionNode = displacementB;

const meshB = new THREE.Mesh( geometryB, materialB );
meshB.position.set(50,0,-50)
scene.add( meshB );








/*ENTREE :
    M        Point à transformer
    O        Point centre de la rotation
    angle    Angle (en degrés)
SORTIE :
    Image de M par la rotation d'angle angle autour de O (les coordonnées ne
    sont pas entières).*/
function rotated (M, O, angle) {
    var xM, yM, x, y;
    angle *= Math.PI / 180;
    xM = M.x - O.x;
    yM = M.y - O.y;
    x = xM * Math.cos (angle) + yM * Math.sin (angle) + O.x;
    y = - xM * Math.sin (angle) + yM * Math.cos (angle) + O.y;
    return ({x:Math.round (x), y:Math.round (y)});
}









var unit1sec = 0
let time = Date.now();
var unit1000ms = 0;

meshB.position.set(0,0,0)
renderer.setAnimationLoop( () => {
  const currentTime = Date.now();
  const deltaTime   = currentTime - time;
  time = currentTime;
  camera.rotate += (22222 ,0,0)
  uTime.value += deltaTime * 0.005 * TRAVEL_SPEED;
  uTime1.value += deltaTime * 0.005;
  renderer.render( scene, camera );
  
  
  
  
  
  
  mesh.rotateZ(0.04)
  meshA.rotateY(0.04)
  meshB.rotateY(-0.04)
  mesh3.rotateY(0.04)
  
  
  let obj = meshwater
  let rotateed = rotated({x: obj.position.x , y: obj.position.z },{x:0,y:0},2)
  obj.position.set((rotateed.x),0,(rotateed.y))
  obj = meshA
  rotateed = rotated({x: obj.position.x , y: obj.position.z },{x:0,y:0},2.5)
  obj.position.set(rotateed.x,0,rotateed.y)
  obj = meshglitched
  rotateed = rotated({x: glity , y: glitz },{x:0,y:0},1.5)
  //obj.position.set(rotateed.x,0,rotateed.y)
  glity = rotateed.x
  glitz = rotateed.y
  obj = mesh2
  rotateed = rotated({x: obj.position.x , y: obj.position.z },{x:0,y:0},1.5)
  obj.position.set(rotateed.x,0,rotateed.y)
  
  
  
  
  
  if (time - unit1000ms > 1000){
    unit1000ms = time
    if (Math.floor(Math.random()*3) == 3){
      meshglitched.position.set(100000,0,0)
    }else{
      meshglitched.position.set(glity,glitx,glitz)
    }
  }


} );

