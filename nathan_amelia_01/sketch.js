import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Constants ---
const WIDTH            = 1400;
const HEIGHT           = 1200;
const WATER_PERCENTAGE = 0.515;
const OCTAVES          = 6;
const PERSISTENCE      = 0.5;
const LACUNARITY       = 2.0;
const SCALE            = 300;
const ELEVATION_OFFSET = 500;
const BASE_HEIGHT      = 0.4;
const MAX_WATER_DIST   = 40;
const SEGMENTS_X       = 512;
const SEGMENTS_Y       = Math.round(SEGMENTS_X * HEIGHT / WIDTH);
const LAND_SCALE       = 300;
const WATER_Z          = -10;
const SHORE_BLEND      = 20;

console.group('🗺️ MAP GENERATOR — INIT');
console.log('WIDTH:',            WIDTH);
console.log('HEIGHT:',           HEIGHT);
console.log('WATER_PERCENTAGE:', WATER_PERCENTAGE);
console.log('OCTAVES:',          OCTAVES);
console.log('PERSISTENCE:',      PERSISTENCE);
console.log('LACUNARITY:',       LACUNARITY);
console.log('SCALE:',            SCALE);
console.log('ELEVATION_OFFSET:', ELEVATION_OFFSET);
console.log('BASE_HEIGHT:',      BASE_HEIGHT);
console.log('MAX_WATER_DIST:',   MAX_WATER_DIST);
console.log('Total pixels:',     WIDTH * HEIGHT);
console.groupEnd();

// --- Scene ---
console.group('🎬 SCENE SETUP');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);
console.log('Camera created — fov:75 aspect:', (window.innerWidth / window.innerHeight).toFixed(3));

const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector('#canvas'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
console.log('WebGPURenderer — viewport:', window.innerWidth, 'x', window.innerHeight);

const planeGeometry = new THREE.PlaneGeometry(WIDTH, HEIGHT, SEGMENTS_X, SEGMENTS_Y);
const planeMaterial = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide });
const plane         = new THREE.Mesh(planeGeometry, planeMaterial);
scene.add(plane);
console.log('Plane added —', WIDTH, 'x', HEIGHT, '— segments:', SEGMENTS_X, 'x', SEGMENTS_Y);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(WIDTH * 0.5, -HEIGHT * 0.5, 800);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
console.log('OrbitControls attached');
console.groupEnd();

// --- Camera fit ---
function fitCamera(camera, width, height) {
  const fovRad    = camera.fov * (Math.PI / 180);
  const aspectCam = camera.aspect;
  const aspectMap = width / height;

  let fitDist;
  if (aspectMap >= aspectCam) {
    const halfW = width / 2;
    const fovH  = 2 * Math.atan(Math.tan(fovRad / 2) * aspectCam);
    fitDist     = halfW / Math.tan(fovH / 2);
    console.log('📐 Contrainte: LARGEUR — aspectMap', aspectMap.toFixed(3), '≥ aspectCam', aspectCam.toFixed(3));
  } else {
    const halfH = height / 2;
    fitDist     = halfH / Math.tan(fovRad / 2);
    console.log('📐 Contrainte: HAUTEUR — aspectMap', aspectMap.toFixed(3), '< aspectCam', aspectCam.toFixed(3));
  }

  const MARGIN          = 1.05;
  camera.position.set(0, 0, fitDist * MARGIN);
  camera.near           = fitDist * 0.01;
  camera.far            = fitDist * 10;
  camera.updateProjectionMatrix();

  console.log('📷 fitCamera:');
  console.log('  map:              ', width, 'x', height);
  console.log('  fitDist:          ', fitDist.toFixed(2));
  console.log('  camera.position.z:', camera.position.z.toFixed(2));
  console.log('  camera.near:      ', camera.near.toFixed(2));
  console.log('  camera.far:       ', camera.far.toFixed(2));

  return fitDist;
}

const fitDist = fitCamera(camera, WIDTH, HEIGHT);

// --- Perlin noise ---
console.group('🔀 PERLIN NOISE SETUP');

function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function lerp(a, b, t) { return a + t * (b - a); }
function grad(hash, x, y) {
  const h = hash & 3;
  const u = h < 2 ? x : y;
  const v = h < 2 ? y : x;
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

const p = new Uint8Array(256);
for (let i = 0; i < 256; i++) p[i] = i;
for (let i = 255; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1));
  [p[i], p[j]] = [p[j], p[i]];
}
const perm = new Uint8Array(512);
for (let i = 0; i < 512; i++) perm[i] = p[i & 255];

console.log('Permutation table — length:', perm.length);
console.log('Perm sample [0..7]:', Array.from(perm.slice(0, 8)));

function noise2D(x, y) {
  const X  = Math.floor(x) & 255;
  const Y  = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u  = fade(xf);
  const v  = fade(yf);
  const aa = perm[(perm[X]           + Y    ) & 255];
  const ab = perm[(perm[X]           + Y + 1) & 255];
  const ba = perm[(perm[(X + 1)&255] + Y    ) & 255];
  const bb = perm[(perm[(X + 1)&255] + Y + 1) & 255];
  return lerp(
    lerp(grad(aa, xf,     yf    ), grad(ba, xf - 1, yf    ), u),
    lerp(grad(ab, xf,     yf - 1), grad(bb, xf - 1, yf - 1), u),
    v
  );
}

function octaveNoise(x, y) {
  let value = 0, amplitude = 1, frequency = 1, max = 0;
  for (let o = 0; o < OCTAVES; o++) {
    value     += noise2D(x * frequency, y * frequency) * amplitude;
    max       += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= LACUNARITY;
  }
  return value / max;
}

function ridgedNoise(x, y) {
  let value = 0, amplitude = 1, frequency = 1, max = 0;
  for (let o = 0; o < OCTAVES; o++) {
    const n   = 1 - Math.abs(noise2D(x * frequency, y * frequency));
    value     += n * n * amplitude;
    max       += amplitude;
    amplitude *= PERSISTENCE;
    frequency *= LACUNARITY;
  }
  return (value / max) * 2 - 1;
}

const noiseTests = [[0,0],[0.5,0.5],[1,1],[2.3,4.7],[10,10]];
console.log('Noise sanity checks:');
noiseTests.forEach(([x, y]) => {
  console.log(
    `  noise2D(${x},${y})=`, noise2D(x, y).toFixed(4),
    '  octave=', octaveNoise(x / SCALE, y / SCALE).toFixed(4),
    '  ridged=', ridgedNoise(x / SCALE, y / SCALE).toFixed(4)
  );
});
console.groupEnd();

// --- Step 1: land/water grid ---
console.group('🌍 STEP 1 — LAND / WATER GRID');
console.time('grid generation');

const grid      = new Uint8Array(WIDTH * HEIGHT);
const threshold = WATER_PERCENTAGE * 2 - 1;
console.log('Threshold (land if n >):', threshold.toFixed(4));

let rawMin = Infinity, rawMax = -Infinity, rawSum = 0;

for (let x = 0; x < WIDTH; x++) {
  for (let y = 0; y < HEIGHT; y++) {
    const n = octaveNoise(x / SCALE, y / SCALE);
    if (n < rawMin) rawMin = n;
    if (n > rawMax) rawMax = n;
    rawSum += n;
    grid[x + y * WIDTH] = n > threshold ? 1 : 0;
  }
}

console.timeEnd('grid generation');

let landCount = 0, waterCount = 0;
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (grid[i] === 1) landCount++; else waterCount++;
}

const landPct  = (landCount  / (WIDTH * HEIGHT) * 100).toFixed(2);
const waterPct = (waterCount / (WIDTH * HEIGHT) * 100).toFixed(2);
console.log('Raw noise range: [', rawMin.toFixed(4), ',', rawMax.toFixed(4), ']');
console.log('Raw noise mean:',     (rawSum / (WIDTH * HEIGHT)).toFixed(4));
console.log('Land pixels:',  landCount,  `(${landPct}%)`);
console.log('Water pixels:', waterCount, `(${waterPct}%)`);
console.log('Land/Water ratio:', (landCount / waterCount).toFixed(3));
console.assert(landCount + waterCount === WIDTH * HEIGHT, '❌ Pixel count mismatch!');
console.assert(landCount  > 0, '❌ No land pixels!');
console.assert(waterCount > 0, '❌ No water pixels!');

const rowStep = Math.max(1, Math.floor(HEIGHT / 10));
console.groupCollapsed('Row density samples');
for (let y = 0; y < HEIGHT; y += rowStep) {
  let rowLand = 0;
  for (let x = 0; x < WIDTH; x++) if (grid[x + y * WIDTH] === 1) rowLand++;
  console.log(`  y=${String(y).padStart(4)}: land=${String(rowLand).padStart(5)}/${WIDTH} (${(rowLand/WIDTH*100).toFixed(1)}%)`);
}
console.groupEnd();
console.groupEnd();

// --- Step 2: elevation map (ridged noise) ---
console.group('⛰️  STEP 2 — ELEVATION MAP');
console.time('elevation generation');

const heightMap      = new Uint8Array(WIDTH * HEIGHT);
const heightMapFloat = new Float32Array(WIDTH * HEIGHT);

const elevPow = BASE_HEIGHT < 0.5
  ? 1 + (0.5 - BASE_HEIGHT) * 6
  : 1 - (BASE_HEIGHT - 0.5) * 1.5;

console.log('BASE_HEIGHT:', BASE_HEIGHT, '→ exponent:', elevPow.toFixed(4));
console.log('Distribution:', elevPow > 1 ? 'skewed LOW (plains)' : elevPow < 1 ? 'skewed HIGH (plateau)' : 'uniform');

let elevMin = Infinity, elevMax = -Infinity, elevSum = 0, elevCount = 0;
const BUCKETS    = 8;
const histogram  = new Array(BUCKETS).fill(0);
const bucketSize = 255 / BUCKETS;

for (let x = 0; x < WIDTH; x++) {
  for (let y = 0; y < HEIGHT; y++) {
    const i = x + y * WIDTH;
    if (grid[i] === 0) {
      heightMap[i]      = 0;
      heightMapFloat[i] = 0;
    } else {
      let n = ridgedNoise((x + ELEVATION_OFFSET) / 150, (y + ELEVATION_OFFSET) / 150);
      n = (n + 1) / 2;
      n = Math.pow(n, elevPow);
      heightMapFloat[i] = n;
      const h = Math.floor(n * 254) + 1;
      heightMap[i] = h;
      if (h < elevMin) elevMin = h;
      if (h > elevMax) elevMax = h;
      elevSum += h;
      elevCount++;
      histogram[Math.min(BUCKETS - 1, Math.floor((h - 1) / bucketSize))]++;
    }
  }
}

console.timeEnd('elevation generation');

const elevMean = elevCount > 0 ? elevSum / elevCount : 0;
console.log('Elevation count:', elevCount, '— expected:', landCount);
console.assert(elevCount === landCount, '❌ Elevation count mismatch!');
console.log('Elevation range: [', elevMin, ',', elevMax, '] — expected [1,255]');
console.assert(elevMin >= 1,   '❌ Elev below 1!');
console.assert(elevMax <= 255, '❌ Elev above 255!');
console.log('Elevation mean:', elevMean.toFixed(2), '| target ~', Math.floor(BASE_HEIGHT * 255));

console.groupCollapsed('Elevation histogram');
histogram.forEach((count, i) => {
  const lo  = Math.floor(i * bucketSize) + 1;
  const hi  = Math.floor((i + 1) * bucketSize);
  const pct = elevCount > 0 ? (count / elevCount * 100).toFixed(1) : '0.0';
  const bar = '█'.repeat(Math.round(count / (elevCount || 1) * 40));
  console.log(`  [${String(lo).padStart(3)}-${String(hi).padStart(3)}] ${String(count).padStart(8)} (${String(pct).padStart(5)}%)  ${bar}`);
});
console.groupEnd();

const corners = [[0,0],[WIDTH-1,0],[0,HEIGHT-1],[WIDTH-1,HEIGHT-1],[Math.floor(WIDTH/2),Math.floor(HEIGHT/2)]];
console.groupCollapsed('Spot checks (corners + center)');
corners.forEach(([x, y]) => {
  const i = x + y * WIDTH;
  console.log(`  (${String(x).padStart(4)},${String(y).padStart(4)}) grid=${grid[i]} h=${heightMap[i]} f=${heightMapFloat[i].toFixed(4)}`);
});
console.groupEnd();
console.groupEnd();

// --- Distance map BFS ---
console.group('🌊 DISTANCE MAP — BFS côte → eau profonde');
console.time('BFS distance map');

const distMap = new Int16Array(WIDTH * HEIGHT).fill(-1);
const queue   = [];

for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (grid[i] === 1) {
    distMap[i] = 0;
    queue.push(i);
  }
}

console.log('BFS seeds (land pixels):', queue.length);

let head = 0;
while (head < queue.length) {
  const i = queue[head++];
  const d = distMap[i];
  if (d >= MAX_WATER_DIST) continue;

  const x = i % WIDTH;
  const y = Math.floor(i / WIDTH);

  if (x > 0          && distMap[i - 1]     === -1 && grid[i - 1]     === 0) { distMap[i - 1]     = d + 1; queue.push(i - 1); }
  if (x < WIDTH  - 1 && distMap[i + 1]     === -1 && grid[i + 1]     === 0) { distMap[i + 1]     = d + 1; queue.push(i + 1); }
  if (y > 0          && distMap[i - WIDTH]  === -1 && grid[i - WIDTH]  === 0) { distMap[i - WIDTH]  = d + 1; queue.push(i - WIDTH); }
  if (y < HEIGHT - 1 && distMap[i + WIDTH]  === -1 && grid[i + WIDTH]  === 0) { distMap[i + WIDTH]  = d + 1; queue.push(i + WIDTH); }
}

console.timeEnd('BFS distance map');

let unvisitedWater = 0, maxDist = 0, distSum = 0, distCount = 0;
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (grid[i] === 0) {
    if (distMap[i] === -1) {
      unvisitedWater++;
    } else {
      if (distMap[i] > maxDist) maxDist = distMap[i];
      distSum += distMap[i];
      distCount++;
    }
  }
}
console.log('Eau côtière (BFS atteinte):', distCount, '| Eau profonde (non atteinte):', unvisitedWater);
console.log('Distance max atteinte:', maxDist, '/ MAX_WATER_DIST:', MAX_WATER_DIST);
console.log('Distance moyenne eau côtière:', distCount > 0 ? (distSum / distCount).toFixed(2) : 'N/A');
console.assert(unvisitedWater + distCount === waterCount, '❌ Eau non comptabilisée!');

// Dist histogram
const distHist = new Array(MAX_WATER_DIST + 1).fill(0);
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (grid[i] === 0 && distMap[i] >= 0) distHist[distMap[i]]++;
}
console.groupCollapsed('Distance histogram (eau côtière, par distance)');
distHist.forEach((count, d) => {
  if (count === 0) return;
  const pct = (count / waterCount * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / waterCount * 60));
  console.log(`  dist=${String(d).padStart(2)}: ${String(count).padStart(8)} (${String(pct).padStart(5)}%)  ${bar}`);
});
console.groupEnd();
console.groupEnd();

// --- Shore distance BFS (water → land) ---
console.group('🏖️  SHORE DISTANCE — BFS water → land');
console.time('shore BFS');

const shoreDist = new Int16Array(WIDTH * HEIGHT).fill(-1);
const shoreQueue = [];

for (let i = 0; i < WIDTH * HEIGHT; i++) {
  if (grid[i] === 0) {
    shoreDist[i] = 0;
    shoreQueue.push(i);
  }
}

let shoreHead = 0;
while (shoreHead < shoreQueue.length) {
  const i = shoreQueue[shoreHead++];
  const d = shoreDist[i];
  if (d >= SHORE_BLEND) continue;

  const x = i % WIDTH;
  const y = Math.floor(i / WIDTH);

  if (x > 0          && shoreDist[i - 1]    === -1) { shoreDist[i - 1]    = d + 1; shoreQueue.push(i - 1); }
  if (x < WIDTH  - 1 && shoreDist[i + 1]    === -1) { shoreDist[i + 1]    = d + 1; shoreQueue.push(i + 1); }
  if (y > 0          && shoreDist[i - WIDTH] === -1) { shoreDist[i - WIDTH] = d + 1; shoreQueue.push(i - WIDTH); }
  if (y < HEIGHT - 1 && shoreDist[i + WIDTH] === -1) { shoreDist[i + WIDTH] = d + 1; shoreQueue.push(i + WIDTH); }
}

console.timeEnd('shore BFS');
console.log('SHORE_BLEND:', SHORE_BLEND);
console.groupEnd();

// --- Color ---
console.group('🎨 COLOR MAP');

function getColor(i) {
  const isWater = grid[i] === 0;
  const h       = heightMap[i];

  if (isWater) {
    const dist = distMap[i];
    const t    = dist === -1 ? 1.0 : dist / MAX_WATER_DIST;
    // shallow (t=0): turquoise clair — deep (t=1): bleu marine profond
    const r = Math.round(10  + (1 - t) * (80  - 10));
    const g = Math.round(40  + (1 - t) * (180 - 40));
    const b = Math.round(100 + (1 - t) * (220 - 100));
    return [r, g, b];
  }

  if (h <= 55)  return [210, 190, 140]; // sable / plage
  if (h <= 100) return [100, 160,  75]; // plaines / prairies
  if (h <= 150) return [ 60, 120,  45]; // forêt / collines
  if (h <= 195) return [120, 100,  80]; // roche montagne
  if (h <= 225) return [160, 140, 130]; // haute montagne
  return              [240, 245, 255];  // neige / sommet
}

const colorTests = [
  { label: 'eau profonde', i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===0&&distMap[i]===-1) return i; return 0; })() },
  { label: 'eau côtière', i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===0&&distMap[i]===1) return i; return 0; })() },
  { label: 'sable',       i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===1&&heightMap[i]<=55) return i; return 0; })() },
  { label: 'plaine',      i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===1&&heightMap[i]>55&&heightMap[i]<=100) return i; return 0; })() },
  { label: 'forêt',       i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===1&&heightMap[i]>100&&heightMap[i]<=150) return i; return 0; })() },
  { label: 'roche',       i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===1&&heightMap[i]>150&&heightMap[i]<=195) return i; return 0; })() },
  { label: 'neige',       i: (() => { for (let i=0;i<WIDTH*HEIGHT;i++) if(grid[i]===1&&heightMap[i]>225) return i; return 0; })() },
];
colorTests.forEach(({ label, i }) => {
  const [r,g,b] = getColor(i);
  console.log(`  ${label.padEnd(14)} px[${i}] h=${heightMap[i]} dist=${distMap[i]} → rgb(${r},${g},${b})`);
});

// Biome counts
const biomes = { eau_profonde:0, eau_cotiere:0, sable:0, plaine:0, foret:0, roche:0, haute_montagne:0, neige:0 };
for (let i = 0; i < WIDTH * HEIGHT; i++) {
  const h = heightMap[i];
  if (grid[i] === 0) {
    if (distMap[i] === -1) biomes.eau_profonde++; else biomes.eau_cotiere++;
  } else if (h <= 45)  biomes.sable++;
  else if (h <= 100)   biomes.plaine++;
  else if (h <= 150)   biomes.foret++;
  else if (h <= 195)   biomes.roche++;
  else if (h <= 225)   biomes.haute_montagne++;
  else                 biomes.neige++;
}
console.groupCollapsed('Biome pixel counts');
Object.entries(biomes).forEach(([name, count]) => {
  const pct = (count / (WIDTH * HEIGHT) * 100).toFixed(2);
  const bar = '█'.repeat(Math.round(count / (WIDTH * HEIGHT) * 60));
  console.log(`  ${name.padEnd(16)} ${String(count).padStart(8)} (${String(pct).padStart(5)}%)  ${bar}`);
});
console.groupEnd();
console.groupEnd();

// --- Texture ---
console.group('🖼️  TEXTURE BUILD');

const textureData = new Uint8Array(WIDTH * HEIGHT * 4);
const texture     = new THREE.DataTexture(textureData, WIDTH, HEIGHT, THREE.RGBAFormat);
texture.colorSpace = THREE.NoColorSpace;
planeMaterial.map  = texture;
planeMaterial.needsUpdate = true;

console.log('DataTexture —', WIDTH, 'x', HEIGHT, '—', (textureData.byteLength / 1024 / 1024).toFixed(2), 'MB');

function writeStep(label, colorFn) {
  console.time(`write: ${label}`);
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const [r, g, b] = colorFn(i);
    const o = i * 4;
    textureData[o]   = r;
    textureData[o+1] = g;
    textureData[o+2] = b;
    textureData[o+3] = 255;
  }
  texture.needsUpdate = true;
  console.timeEnd(`write: ${label}`);

  console.groupCollapsed(`Pixel samples — ${label}`);
  [0, Math.floor(WIDTH*HEIGHT*0.25), Math.floor(WIDTH*HEIGHT*0.5), Math.floor(WIDTH*HEIGHT*0.75), WIDTH*HEIGHT-1].forEach(idx => {
    const o = idx * 4;
    console.log(`  px[${idx}] rgb(${textureData[o]},${textureData[o+1]},${textureData[o+2]}) grid=${grid[idx]} h=${heightMap[idx]} dist=${distMap[idx]}`);
  });
  console.groupEnd();
}

console.groupEnd();

// --- Vertex displacement ---
function displaceVertices() {
  console.group('🏔️  VERTEX DISPLACEMENT');
  console.time('displacement');

  const pos = planeGeometry.attributes.position;

  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i);
    const vy = pos.getY(i);

    const px = Math.max(0, Math.min(WIDTH  - 1, Math.round(vx + WIDTH  / 2)));
    const py = Math.max(0, Math.min(HEIGHT - 1, Math.round(vy + HEIGHT / 2)));
    const idx = px + py * WIDTH;

    let z;
    if (grid[idx] === 0) {
      const dist = distMap[idx];
      const t = dist === -1 ? 1.0 : dist / MAX_WATER_DIST;
      z = WATER_Z * t;
    } else {
      const sd = shoreDist[idx];
      const blend = (sd !== -1 && sd < SHORE_BLEND) ? sd / SHORE_BLEND : 1.0;
      z = heightMapFloat[idx] * LAND_SCALE * blend;
    }
    pos.setZ(i, z);
  }

  pos.needsUpdate = true;
  planeGeometry.computeVertexNormals();

  console.timeEnd('displacement');
  console.log('Vertices displaced:', pos.count, '— land scale:', LAND_SCALE, '— water z:', WATER_Z);
  console.groupEnd();
}

// --- Animation loop ---
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.renderAsync(scene, camera);
}

// --- Step sequence ---
function step1() {
  console.group('⬛ Step 1 — Black / White');
  writeStep('B&W', i => {
    const b = grid[i] * 255;
    return [b, b, b];
  });

  let leaks = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    const o = i * 4;
    if (grid[i] === 1 && textureData[o] === 0)   leaks++;
    if (grid[i] === 0 && textureData[o] === 255)  leaks++;
  }
  console.assert(leaks === 0, `❌ ${leaks} land/water mismatches`);
  if (leaks === 0) console.log('✅ land=white, water=black — no bleed');
  console.groupEnd();

  renderer.renderAsync(scene, camera).then(() => {
    console.log('✅ Step 1 rendered');
    animate();
    setTimeout(step2, 2000);
  });
}

function step2() {
  console.group('🔲 Step 2 — Greyscale Elevation');
  writeStep('Greyscale', i => {
    const b = heightMap[i];
    return [b, b, b];
  });

  let leaks = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    if (grid[i] === 1 && heightMap[i] === 0) leaks++;
  }
  console.assert(leaks === 0, `❌ ${leaks} land pixels with height=0`);
  if (leaks === 0) console.log('✅ No land/water bleed in heightMap');
  console.groupEnd();

  console.log('✅ Step 2 rendered');
  setTimeout(step3, 2000);
}

function step3() {
  console.group('🌈 Step 3 — Colorized');
  writeStep('Color', i => getColor(i));
  displaceVertices();

  camera.position.set(0, -fitDist * 0.6, fitDist * 0.8);
  camera.lookAt(0, 0, 0);
  controls.update();

  console.groupEnd();
  console.log('✅ Step 3 rendered — colorized 3D map complete');

  console.group('📊 FINAL SUMMARY');
  console.table({
    'WIDTH':           { value: WIDTH },
    'HEIGHT':          { value: HEIGHT },
    'Total pixels':    { value: WIDTH * HEIGHT },
    'Land':            { value: landCount,  pct: landPct  + '%' },
    'Water':           { value: waterCount, pct: waterPct + '%' },
    'Elev min':        { value: elevMin },
    'Elev max':        { value: elevMax },
    'Elev mean':       { value: elevMean.toFixed(2) },
    'Power exponent':  { value: elevPow.toFixed(4) },
    'Threshold':       { value: threshold.toFixed(4) },
    'camera.z':        { value: camera.position.z.toFixed(2) },
    'fitDist':         { value: fitDist.toFixed(2) },
  });

  console.group('🧭 NEXT — 3D');
  console.log('1. PlaneGeometry(WIDTH, HEIGHT, 512, 512) — segments subdivisés');
  console.log('2. Loop geometry.attributes.position — setZ(i, heightMapFloat[i] * 300)');
  console.log('3. geometry.computeVertexNormals() — obligatoire après déplacement');
  console.log('4. MeshBasicMaterial → MeshStandardMaterial');
  console.log('5. AmbientLight + DirectionalLight depuis le haut-droite');
  console.log('6. camera.position.set(0, -fitDist*0.6, fitDist*0.8) pour vue 3D');
  console.log('7. Nappe d\'eau : PlaneGeometry plate z=15 + MeshStandardMaterial bleu transparent');
  console.groupEnd();
  console.log('🏁 Generation complete.');
  console.groupEnd();
}

step1();