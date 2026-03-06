/*

FBM mesh distorition in Three.js

Fractal Brownian motion - adding different iterations of noise (octaves), where we successively increment the frequencies in regular steps (lacunarity) and decrease the amplitude (gain) of the noise we can obtain a finer granularity in the noise and get more fine detail

from: https://thebookofshaders.com/13/
  
@LukaPiskorec 2024

*/

// seed for the perlin noise

noise.seed(4); // float between 0 and 1 or an integer from 1 to 65536, Math.random()

// create renderer

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas: document.querySelector("#canvas"),
});
renderer.setSize(window.innerWidth, window.innerHeight);

// create scene

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  1,
  1000
);
const controls = new THREE.OrbitControls(camera, renderer.domElement);
camera.position.z = 120;
controls.update();

window.addEventListener( 'resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
} );

// define geometry

const sphereRadius = 10;
const sphereDetail = 50; // 0 is perfect icosahedron
const sphereGeometry = new THREE.IcosahedronBufferGeometry(
  sphereRadius,
  sphereDetail
);

// convert from non-indexed to indexed

//const sphereGeometryIndexed = new THREE.BufferGeometryUtils.mergeVertices(sphereGeometry);
//const sphereGeometryIndexed = mergeVertices(sphereGeometry);
const sphereGeometryIndexed = sphereGeometry;


// get attributes

var positionAttribute = sphereGeometryIndexed.attributes.position;
var normalAttribute = sphereGeometryIndexed.attributes.normal;

console.log("number of vertices", positionAttribute.count);

// bounding box - only for the initial sphere, not the final deformed shape!

sphereGeometryIndexed.computeBoundingBox();
//console.log(sphereGeometryIndexed.boundingBox.max);
//console.log(sphereGeometryIndexed.boundingBox.min);



// modify geometry

for (var i = 0; i < positionAttribute.count; i++) {
  // access single vertex (x,y,z)
  var x = positionAttribute.getX(i);
  var y = positionAttribute.getY(i);
  var z = positionAttribute.getZ(i);

  // access components of a normal
  var n_x = normalAttribute.getX(i);
  var n_y = normalAttribute.getY(i);
  var n_z = normalAttribute.getZ(i);

  // FBM parameters
  const octaves = 8;
  const lacunarity = 2.5; // increment the frequency in each octave
  const gain = 0.35; // decrease the amplitude in each octave - 0.35
  var amp = 5.0; // initial amplitude
  var freq = 0.05; // initial frequency
  var offset = 0;

  var power = 2.0; // for ridge and puffy
  var last_noise = 1.0;

  var noise_val, f_mod, o_mod;

  f_mod = [1.0, 1.0, 1.0]; // noise sampling / frequency scale in xyz

  //o_mod = [0.0, 1.0]; // contribution of various noise functions
  var amt = (y + sphereRadius) / (2 * sphereRadius); // (y+radius)/diameter
  o_mod = [blerp(0.0, 1.0, 1.0 - amt), blerp(0.0, 1.0, amt)];

  // loop of octaves
  for (var n = 0; n < octaves; n++) {
    //if (n < 5) {f_mod = [1.0, 0.2, 1.0];}
    //else {f_mod = [1.0, 1.0, 1.0];}

    noise_val = noise.simplex3(
      f_mod[0] * freq * x,
      f_mod[1] * freq * y,
      f_mod[2] * freq * z
    );

    //offset += amp * noise_val; // standard
    //offset += amp * Math.abs(noise_val); // turbulence
    //offset += amp * Math.pow((1.0 - Math.abs(noise_val)), power); // ridge
    //offset += amp * Math.pow((1.0 - noise_val), power); // puffy

    //offset += amp * Math.abs(noise_val * Math.abs(last_noise)); // custom turbulence
    //offset += amp * Math.pow((1.0 - noise_val * Math.abs(last_noise)), power); // custom puffy

    //offset += o_mod[0]*amp*Math.abs(noise_val) + o_mod[1]*amp*Math.pow((1.0-Math.abs(noise_val)),power); // turbulence + ridge

    offset += 0.5 * o_mod[0] * amp * Math.pow(1.0 - noise_val, power) + o_mod[1] * amp * Math.pow(1.0 - Math.abs(noise_val), power); // puffy + ridge

    freq *= lacunarity;
    amp *= gain;
    last_noise = noise_val; // save the noise value
  }

  // apply vertex offset in the direction of the normal
  x += n_x * offset;
  y += n_y * offset;
  z += n_z * offset;

  // write data back to attribute
  positionAttribute.setXYZ(i, x, y, z);
}

// additional transforms

var molith_deform = new THREE.Matrix4().makeScale(1.0, 2.0, 0.5);
var obelix_deform = new THREE.Matrix4().makeScale(0.5, 2.0, 0.5);
var slab_deform = new THREE.Matrix4().makeScale(2.0, 0.5, 2.0);
var wall_deform = new THREE.Matrix4().makeScale(2.0, 1.0, 0.5);
var boulder_deform = new THREE.Matrix4().makeScale(1.0, 1.0, 1.0);

sphereGeometryIndexed.applyMatrix4(molith_deform);



// not sure if this is necessary, but run it if the lighting and shadows look off later

sphereGeometryIndexed.computeVertexNormals();
sphereGeometryIndexed.normalizeNormals();

const rockMaterial = new THREE.MeshNormalMaterial({ flatShading: true });
const rockMesh = new THREE.Mesh(sphereGeometryIndexed, rockMaterial);
scene.add(rockMesh);

// main animation loop

let time = Date.now(); // UNIX time, milliseconds since January 1, 1970, UTC

function animate() {
  const currentTime = Date.now();
  const deltaTime = currentTime - time;
  time = currentTime;

  rockMesh.rotateY(0.0005 * deltaTime);

  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();
