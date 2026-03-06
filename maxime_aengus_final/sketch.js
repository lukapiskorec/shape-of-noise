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
let score = 0

// ─── Configuration ────────────────────────────────────────────

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
  45, window.innerWidth / window.innerHeight, 1, 10000
);
camera.position.set( 0, 500, 50 );

const controls = new OrbitControls( camera, renderer.domElement );
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

// ─── Noise Displacement ───────────────────────────────────────

// ─── Noise Displacement ───────────────────────────────────────

const noiseParams = { octaves: OCTAVES, lacunarity: LACUNARITY, gain: GAIN };

const noiseFn = NOISE_TYPE === 'ridged'
  ? createRidgedNoise( noiseParams )
  : createFBM( noiseParams );

const uTime = uniform( 0.0 );
const travelDir = vec3( TRAVEL_DIRECTION[ 1 ], TRAVEL_DIRECTION[ 1 ], TRAVEL_DIRECTION[ 1 ] );

// vertex displacement: push each vertex along its normal by noise value
const displacedPosition = Fn( () => {

  const pos = positionLocal.toVar();
  const nrm = normalLocal.toVar();

  const noiseInput = pos.mul( NOISE_SCALE ).add( travelDir.mul( uTime ) );
  const noiseVal   = noiseFn( noiseInput ).sub( 0.5 ).mul( DISPLACEMENT_STRENGTH );

  return pos.add( nrm.mul( noiseVal ) );

} )();


// ─── Geometry & Material ──────────────────────────────────────

// ─── Geometry & Material ──────────────────────────────────────

function Monstre(x, y, z, r) {
    // 1. LA BOÎTE INVISIBLE (Le Contrôleur)
    const geoControl = new THREE.BoxGeometry(1, 1, 1);
    const matControl = new THREE.MeshBasicMaterial({ visible: false });
    const controleur = new THREE.Mesh(geoControl, matControl);
    const direction = new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
    controleur.userData.direction = direction; // On stocke la direction ici
    controleur.userData.vitesse = 5;         // Tu peux changer la vitesse ici
    // On positionne le contrôleur aux coordonnées voulues
    controleur.position.set(x, y, z);
    scene.add(controleur);

    // 2. LE GROUPE VISUEL (Enfant du contrôleur)
    const groupeMonstre = new THREE.Group();
    controleur.add(groupeMonstre); // On l'attache au cube invisible

    // --- Géométrie A ---
    const geometry_A = new THREE.TorusKnotGeometry(20, 2, 1000, 100, 11, 5);
    const material_A = new THREE.MeshStandardMaterial({ flatShading: true, side: THREE.DoubleSide });
    if (typeof displacedPosition !== 'undefined') material_A.positionNode = displacedPosition;
    const mesh_A = new THREE.Mesh(geometry_A, material_A);
    mesh_A.rotation.x = -Math.PI / 2;
    groupeMonstre.add(mesh_A);

    // --- Géométrie B (Tube) ---
    class CustomSinCurve extends THREE.Curve {
        getPoint(t, optionalTarget = new THREE.Vector3()) {
            const tx = t * 3 - 1.5;
            const ty = Math.sin(2 * Math.PI * t);
            const tz = 0;
            return optionalTarget.set(tx, ty, tz);
        }
    }
    const path = new CustomSinCurve(1);
    const geometry_B = new THREE.TubeGeometry(path, 100, 0.2, 32, false);
    const material_B = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, side: THREE.DoubleSide });
    const mesh_B = new THREE.Mesh(geometry_B, material_B);
    mesh_B.scale.set(20, 20, 20);
    mesh_B.rotation.z = Math.PI / -6;
    mesh_B.position.y = 20;
    groupeMonstre.add(mesh_B);

    // --- Sphères (Yeux) ---
    const geoSphere = new THREE.SphereGeometry(15, 32, 16);
    
    const sphere1 = new THREE.Mesh(geoSphere, new THREE.MeshStandardMaterial({ color: 0xffff00 }));
    sphere1.position.set(-20, 35, 0);
    sphere1.scale.set(0.75, 0.75, 0.75);
    groupeMonstre.add(sphere1);

    const sphere2 = new THREE.Mesh(geoSphere, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    sphere2.position.set(-30, 35, -5);
    sphere2.scale.set(0.2, 0.2, 0.2);
    groupeMonstre.add(sphere2);

    const sphere3 = new THREE.Mesh(geoSphere, new THREE.MeshBasicMaterial({ color: 0xffff00 }));
    sphere3.position.set(-30, 35, 5);
    sphere3.scale.set(0.2, 0.2, 0.2);
    groupeMonstre.add(sphere3);

    // 3. ORIENTATION
    // On tourne le contrôleur pour qu'il regarde dans la direction 'r'
    controleur.rotation.y = r;

    // On retourne le contrôleur pour pouvoir le manipuler après
    return controleur;
}
function Monstre2(x, y, z, r) {
    // 1. LE CONTRÔLEUR (Le cube invisible qui gère la position réelle)
    const geoControl = new THREE.BoxGeometry(1, 1, 1);
    const matControl = new THREE.MeshBasicMaterial({ visible: false });
    const c2 = new THREE.Mesh(geoControl, matControl);
    
    c2.position.set(x, y, z);
    scene.add(c2);

    // 2. LOGIQUE DE MOUVEMENT (Stockée dans userData)
    const direction = new THREE.Vector3(Math.sin(r), 0, Math.cos(r));
    c2.userData.direction = direction; 
    c2.userData.vitesse = 2; // Vitesse de déplacement

    // 3. LE GROUPE VISUEL (C'est ce qu'on voit à l'écran)
    const group = new THREE.Group();
    c2.add(group);
    group.rotation.y = r; // Oriente le monstre vers sa direction

    const mat = new THREE.MeshStandardMaterial({ color: 0xffff00 }); // Jaune comme demandé
    
    // --- Corps (Le Lathe) ---
    const points = [];
    for (let i = 0; i < 10; i++) {
        // Forme de "vase" basée sur un sinus
        points.push(new THREE.Vector2(Math.sin(i * 0.2) * 10 + 5, (i - 5) * 2));
    }
    const lathe = new THREE.Mesh(new THREE.LatheGeometry(points), mat);
    group.add(lathe);

    // --- Tête et Yeux ---
    const tête = new THREE.Mesh(new THREE.SphereGeometry(15, 16, 16), mat);
    tête.position.y = 20;
    group.add(tête);

    // Petit plus : des yeux noirs pour qu'il soit moins "vide"
    const geoOeil = new THREE.SphereGeometry(2, 8, 8);
    const matOeil = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    
    const oeilDroit = new THREE.Mesh(geoOeil, matOeil);
    oeilDroit.position.set(7, 25, 13);
    group.add(oeilDroit);

    const oeilGauche = new THREE.Mesh(geoOeil, matOeil);
    oeilGauche.position.set(-8, 25, 13);
    group.add(oeilGauche);

    return c2; // On retourne le contrôleur pour le mettre dans le tableau hitbox
}


function creerBateau(x, z) {
  // 1. LE CONTRÔLEUR (Cube invisible)
  const geoControl = new THREE.BoxGeometry(1, 1, 1);
  const matControl = new THREE.MeshBasicMaterial({ 
    visible: false // Rends-le invisible pour le joueur
  });
  const controleur = new THREE.Mesh(geoControl, matControl);
  controleur.position.set(x, 0, z);
  scene.add(controleur);

  // 2. LE GROUPE VISUEL (Enfant du contrôleur)
  const modeleBateau = new THREE.Group();
  controleur.add(modeleBateau); // Le modèle suit maintenant le contrôleur

  // --- Construction du Visuel ---
  // Coque
  const coque = new THREE.Mesh(
    new THREE.BoxGeometry(20, 8, 40),
    new THREE.MeshStandardMaterial({ color: 0x8b4513 })
  );
  modeleBateau.add(coque);

  // Mât
  const mat = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 30, 8),
    new THREE.MeshStandardMaterial({ color: 0x5d4037 })
  );
  mat.position.y = 15;
  modeleBateau.add(mat);

  // Voile
  const voile = new THREE.Mesh(
    new THREE.PlaneGeometry(15, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
  );
  voile.position.set(0, 20, 0);
  voile.rotation.y = Math.PI / 4;
  modeleBateau.add(voile);

  // Lumière (suit le bateau)
  const spotLight = new THREE.SpotLight(0xffffff, 1000, 200, Math.PI / 4);
  spotLight.position.set(0, 100, 0);
  spotLight.target = coque;
  modeleBateau.add(spotLight);

  // On retourne le contrôleur pour pouvoir le manipuler après
  return controleur;
}
let controleur = creerBateau(0,0);
controleur.add(camera);
camera.position.set(0, 500, -500);
camera.lookAt(0, 10, 0);
let hitbox_monstre = [];
for(let i=0 ; i<100 ;i++){
  const random_x = Math.floor(Math.random() * 10001) - 5000;
  const random_z = Math.floor(Math.random() * 10001) - 5000;
  const angleAleatoire = Math.random() * Math.PI * 2;
  hitbox_monstre.push(Monstre(random_x , 0 , random_z,angleAleatoire));
}
for(let i=0 ; i<100 ;i++){
  const random_x = Math.floor(Math.random() * 10001) - 5000;
  const random_z = Math.floor(Math.random() * 10001) - 5000;
  Monstre2(random_x , 0 , random_z);
  const angleAleatoire = Math.random() * Math.PI * 2;
  hitbox_monstre.push(Monstre2(random_x , 0 , random_z,angleAleatoire));
}


const geometryPlayer = new THREE.BoxGeometry( 125,75,75 );
const materialPlayer = new THREE.MeshBasicMaterial( { color: 0x582900 } );
const cube_Player = new THREE.Mesh( geometryPlayer, materialPlayer );

let x_x = 0;
let z_z = 0;
let estMort = false;
let time = Date.now();
let count = 0;
let hitbox_rochers = [];
cube_Player.position.set(x_x,0,z_z)

const geometry = new THREE.PlaneGeometry( 10000, 10000, 500, 500 );

const material = new THREE.MeshStandardMaterial( { color: 0xffffff, flatShading: true, side: THREE.DoubleSide } );
material.positionNode = displacedPosition;

const mesh = new THREE.Mesh( geometry, material );
mesh.rotation.x = -Math.PI / 2;
scene.add( mesh );

// ─── Light ──────────────────────────────────────

// ─── Light ──────────────────────────────────────

const directionalLight_A = new THREE.DirectionalLight( 0x0000ff, 0.5 );
const directionalLight_B = new THREE.DirectionalLight( 0xff0000, 0.5 );
directionalLight_A.position.set( 0,10,0);
directionalLight_B.position.set( 0,-10,0);
scene.add( directionalLight_A );
scene.add( directionalLight_B );

// ─── Voxel Cubes ─────────────────────────────────────────────

// ─── Voxel Cubes ─────────────────────────────────────────────

const VOXEL_GRID_SIZE    = 40;
const VOXEL_BOX_SIZE     = 2;
const VOXEL_NOISE_SCALE  = 0.6;
const VOXEL_THRESHOLD    = 0.25;
const VOXEL_COUNT        = 40;     // number of cubes
const VOXEL_ORIGIN       = [ 100, 0, 100 ];  // position of the first cube
const VOXEL_SPACING      = 400;    // X offset between cubes


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
  const halfGrid   = VOXEL_GRID_SIZE / 2;
  const radiusSq   = halfGrid * halfGrid;

  
  for ( let iz = 0; iz < VOXEL_GRID_SIZE; iz++ ) {
    for ( let iy = 0; iy < VOXEL_GRID_SIZE; iy++ ) {
      for ( let ix = 0; ix < VOXEL_GRID_SIZE; ix++ ) {
        const idx = ix + iy * VOXEL_GRID_SIZE + iz * VOXEL_GRID_SIZE * VOXEL_GRID_SIZE;
        if ( noiseField[ idx ] < VOXEL_THRESHOLD ) continue;
        
        // discard voxels outside a sphere centered on the grid
        const dx = ix - halfGrid;
        const dy = iy - halfGrid;
        const dz = iz - halfGrid;
        if ( dx * dx + dy * dy + dz * dz > radiusSq ) continue;

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
  // --- Modifié : Création du mesh et de sa lumière dédiée ---
  const instanceCount = voxelPositions.length / 3;
  if ( instanceCount === 0 ) continue;

  const voxelGeometry = new THREE.BoxGeometry( VOXEL_BOX_SIZE, VOXEL_BOX_SIZE, VOXEL_BOX_SIZE );
  const voxelMaterial = new THREE.MeshStandardMaterial( { color: 0x808080, flatShading: true } );
  const voxelMesh = new THREE.InstancedMesh( voxelGeometry, voxelMaterial, instanceCount );

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

  const random_x = Math.random();
  const random_z = Math.random();
  const spacingX = 1000*random_x;
  const spacingZ = -150*random_z;
  
  const posX = VOXEL_ORIGIN[ 0 ] + c * spacingX;
  const posY = VOXEL_ORIGIN[ 1 ]; 
  const posZ = VOXEL_ORIGIN[ 2 ] + c * spacingZ;

  voxelMesh.position.set( posX, posY, posZ );
  scene.add( voxelMesh );
  hitbox_rochers.push(voxelMesh);

  // Ajout de la lumière qui suit l'amas
  const localLight = new THREE.PointLight( 0xffffff, 500, 150 ); 
  localLight.position.set( posX, posY + 75, posZ ); 
  scene.add( localLight );
}



// ─── Animation Loop ───────────────────────────────────────────

// ─── Animation Loop ───────────────────────────────────────────

renderer.setAnimationLoop(() => {
    if (estMort) return;

    const currentTime = Date.now();
    const deltaTime = currentTime - time;
    time = currentTime;

    if (uTime) uTime.value += deltaTime * 0.0001 * TRAVEL_SPEED;

    // --- LOGIQUE DES MONSTRES ---
    for (let i = 0; i < hitbox_monstre.length; i++) {
        const m1 = hitbox_monstre[i];
        if (!m1 || !m1.userData.direction) continue;

        // Déplacement
        m1.position.x += m1.userData.direction.x * (m1.userData.vitesse || 2);
        m1.position.z += m1.userData.direction.z * (m1.userData.vitesse || 2);

        // Collision entre monstres (Rebond)
        for (let j = i + 1; j < hitbox_monstre.length; j++) {
            const m2 = hitbox_monstre[j];
            if (!m2) continue;

            if (m1.position.distanceTo(m2.position) < 40) {
                m1.userData.direction.negate(); // Inverse direction m1
                m2.userData.direction.negate(); // Inverse direction m2
            }
        }
    }

    // --- COLLISIONS MORTELLES (Toutes les 5 frames pour la performance) ---
    count++;
    if (count > 5) {
        // Mort par Monstre
        for (const m of hitbox_monstre) {
            if (controleur.position.distanceTo(m.position) < 50) {
                declencherMort("UN MONSTRE T'A COULÉ ! ton score est de "+ score);
            }
        }

        // Mort par Rocher (Voxel)
        for (const r of hitbox_rochers) {
            if (controleur.position.distanceTo(r.position) < 70) {
                declencherMort("NAUFRAGE SUR LES RÉCIFS ! ton score est de "+ score);
            }
        }
        count = 0;
    }

    renderer.render(scene, camera);
});

// Fonction utilitaire pour la mort
function declencherMort(message) {
    estMort = true;
    alert(message);
    location.reload(); // Relance le jeu proprement
}
//─── Merde à prévoir ───────────────────────────────────────────
  
//─── Merde à prévoir ───────────────────────────────────────────
  


const toRad = (deg) => deg * (Math.PI / 180);
let orientation = 0; // 0: +X, 1: +Z, 2: -X, 3: -Z

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    // --- TOURNER À GAUCHE (Q) ---
    if (key === 'q') {
        orientation = (orientation + 3) % 4; // Recule de 1 dans l'ordre 0,1,2,3
    } 
    // --- TOURNER À DROITE (D) ---
    else if (key === 'd') {
        orientation = (orientation + 1) % 4; // Avance de 1 dans l'ordre 0,1,2,3
    }

    // Appliquer la rotation visuelle selon l'orientation
    // On mappe : 0 -> 90°, 1 -> 0°, 2 -> 270°, 3 -> 180°
    const angles = [90, 0, 270, 180];
    controleur.rotation.y = toRad(angles[orientation]);

    if (key === 'z') {
        score += 1; // On augmente le score une seule fois ici !
        if (orientation === 0) { x_x += 10; }
        else if (orientation === 1) { z_z += 10; }
        else if (orientation === 2) { x_x -= 10; }
        else if (orientation === 3) { z_z -= 10; }
    }
    // --- RECULER (S) ---
    else if (key === 's') {
        score += 1;
        if (orientation === 0) { x_x -= 10; }
        else if (orientation === 1) { z_z -= 10; }
        else if (orientation === 2) { x_x += 10; }
        else if (orientation === 3) { z_z += 10; }
    }

    // Mettre à jour la position
    controleur.position.set(x_x, 0, z_z);
});