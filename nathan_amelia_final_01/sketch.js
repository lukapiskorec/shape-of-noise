import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ════════════════════════════════════════════════════════════════
//  CONFIGURATION — lue depuis l'UI au moment de la génération
// ════════════════════════════════════════════════════════════════
function readConfig() {
  const w    = parseInt(document.getElementById('inp-w')?.value)         || 1400;
  const h    = parseInt(document.getElementById('inp-h')?.value)         || 1200;
  const seed = parseInt(document.getElementById('inp-seed')?.value)      || Math.floor(Math.random() * 999999);
  return {
    WIDTH:            Math.max(256, Math.min(2048, w)),
    HEIGHT:           Math.max(256, Math.min(2048, h)),
    SEED:             seed,
    WATER_PERCENTAGE: parseFloat(document.getElementById('sl-water')?.value      || 51.5) / 100,
    SCALE:            parseInt(document.getElementById('sl-scale')?.value        || 300),
    OCTAVES:          parseInt(document.getElementById('sl-octaves')?.value      || 6),
    BASE_HEIGHT:      parseFloat(document.getElementById('sl-baseheight')?.value || 0.4),
    MAX_WATER_DIST:   parseInt(document.getElementById('sl-waterdist')?.value    || 40),
    LAND_SCALE:       parseInt(document.getElementById('sl-landscale')?.value    || 300),
  };
}

// ════════════════════════════════════════════════════════════════
//  UI HELPERS
// ════════════════════════════════════════════════════════════════
function uiStatus(text, state) {
  const dot  = document.getElementById('statusGem');
  const txt  = document.getElementById('statusText');
  if (txt) txt.textContent = text;
  if (dot) dot.className = 'status-gem ' + (state || '');
}
function uiSetLoading(msg) {
  const ol  = document.getElementById('loading');
  const sub = document.getElementById('loading-sub');
  if (ol)  { ol.style.display = 'flex'; ol.classList.remove('hidden'); }
  if (sub) sub.textContent = msg || 'Tissage en cours…';
}
function uiHideLoading() {
  const ol = document.getElementById('loading');
  if (!ol) return;
  ol.classList.add('hidden');
  setTimeout(() => { ol.style.display = 'none'; }, 650);
}
function uiStep(n) {
  document.querySelectorAll('.step-btn').forEach(btn => {
    const s = parseInt(btn.dataset.step);
    btn.classList.toggle('active', s === n);
    btn.classList.toggle('done',   s < n);
  });
  const ss = document.getElementById('stat-step');
  if (ss) ss.textContent = n + ' / 4';
}
function uiStats(cfg, lPct, wPct, eMin, eMax) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('stat-land',  lPct + '%');
  set('stat-water', wPct + '%');
  set('stat-elev',  eMin + '–' + eMax);
  set('stat-size',  cfg.WIDTH + '×' + cfg.HEIGHT);
  const sd = document.getElementById('seedLabel');
  if (sd) sd.textContent = 'Graine ' + cfg.SEED;
  const si = document.getElementById('inp-seed');
  if (si) si.value = cfg.SEED;
}
function uiHint(msg) {
  const el = document.getElementById('footer-hint');
  if (el) el.textContent = msg;
}

// ════════════════════════════════════════════════════════════════
//  THREE.JS SCENE — created once, reused across generations
// ════════════════════════════════════════════════════════════════
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a1a);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100000);

const renderer = new THREE.WebGPURenderer({
  canvas: document.querySelector('#canvas'),
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
await renderer.init();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
scene.add(dirLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping  = true;
controls.dampingFactor  = 0.05;

// Camera fit helper
let _fitDist = 800;
function fitCamera(cfg) {
  dirLight.position.set(cfg.WIDTH * 0.5, -cfg.HEIGHT * 0.5, 800);

  const fovRad    = camera.fov * (Math.PI / 180);
  const aspectCam = camera.aspect;
  const aspectMap = cfg.WIDTH / cfg.HEIGHT;
  let fitDist;
  if (aspectMap >= aspectCam) {
    const fovH = 2 * Math.atan(Math.tan(fovRad / 2) * aspectCam);
    fitDist    = (cfg.WIDTH / 2) / Math.tan(fovH / 2);
  } else {
    fitDist = (cfg.HEIGHT / 2) / Math.tan(fovRad / 2);
  }
  camera.near = fitDist * 0.01;
  camera.far  = fitDist * 10;
  camera.position.set(0, 0, fitDist * 1.05);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
  controls.target.set(0, 0, 0);
  controls.update();
  _fitDist = fitDist;
  console.log('📷 fitCamera fitDist', fitDist.toFixed(0), '| z', camera.position.z.toFixed(0));
  return fitDist;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.renderAsync(scene, camera);
}
animate();

// ════════════════════════════════════════════════════════════════
//  MESH MANAGEMENT — two meshes: flat (steps 1/2/3) + relief (step 4)
//  The flat mesh is NEVER displaced so 2D views always work.
//  goToStep swaps .visible between them.
// ════════════════════════════════════════════════════════════════
let _flatMesh = null, _reliefMesh = null;

function buildMeshes(cfg, texture) {
  // Dispose previous meshes
  for (const m of [_flatMesh, _reliefMesh]) {
    if (m) { scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
  }

  const SEGMENTS_X = 512;
  const SEGMENTS_Y = Math.round(SEGMENTS_X * cfg.HEIGHT / cfg.WIDTH);

  // Flat mesh — single quad, always Z=0, used for steps 1/2/3
  const flatGeo  = new THREE.PlaneGeometry(cfg.WIDTH, cfg.HEIGHT);
  const flatMat  = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
  _flatMesh      = new THREE.Mesh(flatGeo, flatMat);
  _flatMesh.visible = true;
  scene.add(_flatMesh);

  // Relief mesh — subdivided, will be displaced, used for step 4
  const reliefGeo = new THREE.PlaneGeometry(cfg.WIDTH, cfg.HEIGHT, SEGMENTS_X, SEGMENTS_Y);
  const reliefMat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
  _reliefMesh     = new THREE.Mesh(reliefGeo, reliefMat);
  _reliefMesh.visible = false;
  scene.add(_reliefMesh);

  return { flatGeo, flatMat, reliefGeo, reliefMat };
}

// ════════════════════════════════════════════════════════════════
//  NOISE — Perlin CPU
// ════════════════════════════════════════════════════════════════
function buildPerm(seed) {
  let s = seed >>> 0;
  const rng = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const arr = new Uint8Array(256);
  for (let i = 0; i < 256; i++) arr[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = arr[i & 255];
  return perm;
}

function makeNoiseFns(perm, cfg) {
  const fade = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + t * (b - a);
  const grad = (hash, x, y) => {
    const h = hash & 3, u = h < 2 ? x : y, v = h < 2 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
  };
  function noise2D(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x), yf = y - Math.floor(y);
    const u = fade(xf), v = fade(yf);
    const aa = perm[(perm[X]             + Y    ) & 255];
    const ab = perm[(perm[X]             + Y + 1) & 255];
    const ba = perm[(perm[(X + 1) & 255] + Y    ) & 255];
    const bb = perm[(perm[(X + 1) & 255] + Y + 1) & 255];
    return lerp(
      lerp(grad(aa, xf, yf    ), grad(ba, xf - 1, yf    ), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  }
  function octaveNoise(x, y) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let o = 0; o < cfg.OCTAVES; o++) {
      val += noise2D(x * freq, y * freq) * amp;
      max += amp; amp *= 0.5; freq *= 2.0;
    }
    return val / max;
  }
  function ridgedNoise(x, y) {
    let val = 0, amp = 1, freq = 1, max = 0;
    for (let o = 0; o < cfg.OCTAVES; o++) {
      const n = 1 - Math.abs(noise2D(x * freq, y * freq));
      val += n * n * amp; max += amp; amp *= 0.5; freq *= 2.0;
    }
    return (val / max) * 2 - 1;
  }
  return { noise2D, octaveNoise, ridgedNoise };
}

// ════════════════════════════════════════════════════════════════
//  MAP GENERATION
// ════════════════════════════════════════════════════════════════
function generateMap(cfg) {
  const { WIDTH, HEIGHT, SCALE, MAX_WATER_DIST } = cfg;
  const ELEVATION_OFFSET = 500;
  const SHORE_BLEND      = 20;
  const WATER_Z          = -10;

  const perm = buildPerm(cfg.SEED);
  const { octaveNoise, ridgedNoise } = makeNoiseFns(perm, cfg);

  // ── Step 1: land/water grid ──────────────────────────────────
  uiStatus('Grille Terre / Eau…', 'active');
  uiStep(1);
  console.group('🌍 STEP 1 — LAND / WATER GRID');
  console.time('grid');

  const grid      = new Uint8Array(WIDTH * HEIGHT);
  const threshold = cfg.WATER_PERCENTAGE * 2 - 1;
  let rawMin = Infinity, rawMax = -Infinity, rawSum = 0;

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      const n = octaveNoise(x / SCALE, y / SCALE);
      if (n < rawMin) rawMin = n; if (n > rawMax) rawMax = n; rawSum += n;
      grid[x + y * WIDTH] = n > threshold ? 1 : 0;
    }
  }
  console.timeEnd('grid');

  let landCount = 0, waterCount = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i++) grid[i] === 1 ? landCount++ : waterCount++;
  const landPct  = (landCount  / (WIDTH * HEIGHT) * 100).toFixed(2);
  const waterPct = (waterCount / (WIDTH * HEIGHT) * 100).toFixed(2);

  console.log('Noise range [', rawMin.toFixed(4), ',', rawMax.toFixed(4), '] mean', (rawSum/(WIDTH*HEIGHT)).toFixed(4));
  console.log('Land:', landCount, `(${landPct}%) | Water:`, waterCount, `(${waterPct}%)`);
  console.assert(landCount  > 0, '❌ No land');
  console.assert(waterCount > 0, '❌ No water');
  console.groupEnd();

  // ── Step 2: elevation ───────────────────────────────────────
  uiStatus('Carte d\'élévation…', 'active');
  uiStep(2);
  console.group('⛰️ STEP 2 — ELEVATION');
  console.time('elevation');

  const heightMap      = new Uint8Array(WIDTH * HEIGHT);
  const heightMapFloat = new Float32Array(WIDTH * HEIGHT);
  const elevPow        = cfg.BASE_HEIGHT < 0.5
    ? 1 + (0.5 - cfg.BASE_HEIGHT) * 6
    : 1 - (cfg.BASE_HEIGHT - 0.5) * 1.5;

  let elevMin = Infinity, elevMax = -Infinity, elevSum = 0, elevCount = 0;

  for (let x = 0; x < WIDTH; x++) {
    for (let y = 0; y < HEIGHT; y++) {
      const i = x + y * WIDTH;
      if (grid[i] === 0) { heightMap[i] = 0; heightMapFloat[i] = 0; continue; }
      let n = ridgedNoise((x + ELEVATION_OFFSET) / 150, (y + ELEVATION_OFFSET) / 150);
      n = Math.pow((n + 1) / 2, elevPow);
      heightMapFloat[i] = n;
      const h = Math.floor(n * 254) + 1;
      heightMap[i] = h;
      if (h < elevMin) elevMin = h; if (h > elevMax) elevMax = h;
      elevSum += h; elevCount++;
    }
  }
  console.timeEnd('elevation');
  const elevMean = elevCount > 0 ? elevSum / elevCount : 0;
  console.log('Elevation [', elevMin, ',', elevMax, '] mean', elevMean.toFixed(2));
  console.assert(elevMin >= 1,   '❌ Elev below 1');
  console.assert(elevMax <= 255, '❌ Elev above 255');
  console.groupEnd();

  // ── BFS water depth ─────────────────────────────────────────
  console.group('🌊 BFS water depth');
  console.time('BFS water');
  const distMap = new Int16Array(WIDTH * HEIGHT).fill(-1);
  const bfsQ = [];
  for (let i = 0; i < WIDTH * HEIGHT; i++) if (grid[i] === 1) { distMap[i] = 0; bfsQ.push(i); }
  let bfsHead = 0;
  while (bfsHead < bfsQ.length) {
    const i = bfsQ[bfsHead++];
    const d = distMap[i];
    if (d >= MAX_WATER_DIST) continue;
    const x = i % WIDTH, y = Math.floor(i / WIDTH);
    for (const ni of [x>0?i-1:-1, x<WIDTH-1?i+1:-1, y>0?i-WIDTH:-1, y<HEIGHT-1?i+WIDTH:-1]) {
      if (ni === -1 || distMap[ni] !== -1 || grid[ni] !== 0) continue;
      distMap[ni] = d + 1; bfsQ.push(ni);
    }
  }
  console.timeEnd('BFS water');
  let deepW = 0, coastW = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i++) {
    if (grid[i] !== 0) continue;
    distMap[i] === -1 ? deepW++ : coastW++;
  }
  console.log('Deep water:', deepW, '| Coastal:', coastW);
  console.groupEnd();

  // ── BFS shore blend ─────────────────────────────────────────
  console.group('🏖️ BFS shore blend');
  console.time('BFS shore');
  const shoreDist  = new Int16Array(WIDTH * HEIGHT).fill(-1);
  const shoreQueue = [];
  for (let i = 0; i < WIDTH * HEIGHT; i++) if (grid[i] === 0) { shoreDist[i] = 0; shoreQueue.push(i); }
  let shoreHead = 0;
  while (shoreHead < shoreQueue.length) {
    const i = shoreQueue[shoreHead++];
    const d = shoreDist[i];
    if (d >= SHORE_BLEND) continue;
    const x = i % WIDTH, y = Math.floor(i / WIDTH);
    for (const ni of [x>0?i-1:-1, x<WIDTH-1?i+1:-1, y>0?i-WIDTH:-1, y<HEIGHT-1?i+WIDTH:-1]) {
      if (ni === -1 || shoreDist[ni] !== -1) continue;
      shoreDist[ni] = d + 1; shoreQueue.push(ni);
    }
  }
  console.timeEnd('BFS shore');
  console.groupEnd();

  // ── Color function ──────────────────────────────────────────
  function getColor(i) {
    if (grid[i] === 0) {
      const dist = distMap[i];
      const t    = dist === -1 ? 1.0 : dist / MAX_WATER_DIST;
      return [
        Math.round(10  + (1 - t) * (80  - 10)),
        Math.round(40  + (1 - t) * (180 - 40)),
        Math.round(100 + (1 - t) * (220 - 100)),
      ];
    }
    const h = heightMap[i];
    if (h <= 55)  return [210, 190, 140];
    if (h <= 100) return [100, 160,  75];
    if (h <= 150) return [ 60, 120,  45];
    if (h <= 195) return [120, 100,  80];
    if (h <= 225) return [160, 140, 130];
    return              [240, 245, 255];
  }

  // ── Texture ─────────────────────────────────────────────────
  const textureData = new Uint8Array(WIDTH * HEIGHT * 4);
  const texture     = new THREE.DataTexture(textureData, WIDTH, HEIGHT, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;

  function writeTexture(colorFn) {
    for (let i = 0; i < WIDTH * HEIGHT; i++) {
      const [r, g, b] = colorFn(i);
      const o = i * 4;
      textureData[o] = r; textureData[o+1] = g; textureData[o+2] = b; textureData[o+3] = 255;
    }
    texture.needsUpdate = true;
  }

  // ── Build two meshes (flat + relief) ────────────────────────
  const { reliefGeo } = buildMeshes(cfg, texture);

  // Displace relief mesh once — stored permanently on reliefGeo
  let _reliefReady = false;
  function ensureRelief() {
    if (_reliefReady) return;
    console.group('🏔️ VERTEX DISPLACEMENT');
    console.time('displacement');
    const pos = reliefGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const vx  = pos.getX(i), vy = pos.getY(i);
      const px  = Math.max(0, Math.min(WIDTH  - 1, Math.round(vx + WIDTH  / 2)));
      const py  = Math.max(0, Math.min(HEIGHT - 1, Math.round(vy + HEIGHT / 2)));
      const idx = px + py * WIDTH;
      let z;
      if (grid[idx] === 0) {
        const t = distMap[idx] === -1 ? 1.0 : distMap[idx] / MAX_WATER_DIST;
        z = WATER_Z * t;
      } else {
        const sd    = shoreDist[idx];
        const blend = (sd !== -1 && sd < SHORE_BLEND) ? sd / SHORE_BLEND : 1.0;
        z = heightMapFloat[idx] * cfg.LAND_SCALE * blend;
      }
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
    reliefGeo.computeVertexNormals();
    console.timeEnd('displacement');
    console.log('Vertices displaced:', pos.count, '| LAND_SCALE:', cfg.LAND_SCALE);
    console.groupEnd();
    _reliefReady = true;
  }

  // ── Step sequence — navigable ────────────────────────────────
  let _currentStep = 0;

  function goToStep(s) {
    _currentStep = s;
    uiStep(s);

    const is3D = s === 4;

    // Swap mesh visibility — flat for 2D, relief for 3D
    _flatMesh.visible   = !is3D;
    _reliefMesh.visible =  is3D;

    if (s === 1) {
      writeTexture(i => { const b = grid[i] * 255; return [b, b, b]; });
      camera.position.set(0, 0, _fitDist * 1.05);
      camera.lookAt(0, 0, 0); controls.target.set(0,0,0); controls.update();
      uiStatus('Grille Terre / Eau', 'ready');
      uiHint('Grille binaire : blanc = terre, noir = eau');
    } else if (s === 2) {
      writeTexture(i => { const b = heightMap[i]; return [b, b, b]; });
      camera.position.set(0, 0, _fitDist * 1.05);
      camera.lookAt(0, 0, 0); controls.target.set(0,0,0); controls.update();
      uiStatus('Carte d\'élévation', 'ready');
      uiHint('Niveaux de gris : plus clair = plus haut');
    } else if (s === 3) {
      writeTexture(getColor);
      camera.position.set(0, 0, _fitDist * 1.05);
      camera.lookAt(0, 0, 0); controls.target.set(0,0,0); controls.update();
      uiStatus('Carte Colorisée', 'ready');
      uiHint('Carte 2D complète · Molette pour zoomer');
    } else if (s === 4) {
      writeTexture(getColor);
      ensureRelief(); // displace once, then reuses same geometry
      camera.position.set(0, -_fitDist * 0.6, _fitDist * 0.8);
      camera.lookAt(0, 0, 0); controls.target.set(0,0,0); controls.update();
      uiStatus('Monde en Relief', 'ready');
      uiHint('Vue 3D · Glisser pour orbiter · Molette pour zoomer');
    }
  }

  
  // Auto-progress 1 → 2 → 3 → 4
  goToStep(1);
  uiStats(cfg, landPct, waterPct, elevMin, elevMax);
  renderer.renderAsync(scene, camera).then(() => {
    uiHideLoading();
    setTimeout(() => {
      goToStep(2);
      setTimeout(() => {
        goToStep(3);
        setTimeout(() => goToStep(4), 2000);
      }, 2000);
    }, 200);
  });

  // Expose navigation for buttons
  return { goToStep, getCurrentStep: () => _currentStep };
}

// ════════════════════════════════════════════════════════════════
//  BUTTONS WIRING
// ════════════════════════════════════════════════════════════════

let _mapAPI = null; // { goToStep, getCurrentStep }

async function runGeneration() {
  const cfg = readConfig();
  uiSetLoading('Éveil du chaos primordial…');
  uiStatus('Tissage en cours…', 'active');

  // Let the DOM repaint before heavy CPU work
  await new Promise(r => setTimeout(r, 120));

  fitCamera(cfg);
  _mapAPI = generateMap(cfg);
}

// Step buttons
document.querySelectorAll('.step-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!_mapAPI) return;
    _mapAPI.goToStep(parseInt(btn.dataset.step));
  });
});

// 2D / 3D toggle
document.getElementById('btn-toggle-3d').addEventListener('click', () => {
  if (!_mapAPI) return;
  const s = _mapAPI.getCurrentStep();
  _mapAPI.goToStep(s === 4 ? 3 : 4);
  const btn = document.getElementById('btn-toggle-3d');
  btn.classList.toggle('action-btn--primary', _mapAPI.getCurrentStep() === 4);
});

// Zoom
document.getElementById('btn-zoom-in').addEventListener('click', () => {
  camera.position.multiplyScalar(0.8);
  controls.update();
});
document.getElementById('btn-zoom-out').addEventListener('click', () => {
  camera.position.multiplyScalar(1.25);
  controls.update();
});
document.getElementById('btn-zoom-reset').addEventListener('click', () => {
  if (!_mapAPI) return;
  _mapAPI.goToStep(_mapAPI.getCurrentStep()); // re-applies camera position for current step
});

// New map — random seed
document.getElementById('btn-new-map').addEventListener('click', () => {
  const seedInp = document.getElementById('inp-seed');
  if (seedInp) seedInp.value = Math.floor(Math.random() * 999999);
  runGeneration();
});

// Apply config
document.getElementById('btn-apply').addEventListener('click', () => {
  runGeneration();
});

// ── Boot ──────────────────────────────────────────────────────
console.log('🚀 Sylvara boot');
runGeneration();