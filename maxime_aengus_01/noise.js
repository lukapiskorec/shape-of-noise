/*

Noise functions for TSL (Three.js Shading Language)

Provides a base 3D Perlin noise and two layered noise types built on top:
  - Fractal Brownian Motion (FBM): smooth, natural terrain
  - Ridged Noise: sharp creases and mountain-like ridges

FBM and Ridged Noise reference:
https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders

@LukaPiskorec 2026

*/


import {
  Fn, float, vec3,
  floor, fract, sin, cos, dot, mix,
  abs, oneMinus, Loop
} from 'three/tsl';


// ─── 3D Perlin Noise (base) ──────────────────────────────────


const randomGradient3D = Fn( ( [ p ] ) => {

  const phi   = fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ).mul( 43758.5453 ) ).mul( Math.PI * 2 );
  const theta = fract( sin( dot( p, vec3( 269.5, 183.3, 246.1 ) ) ).mul( 43758.5453 ) ).mul( Math.PI );
  return vec3(
    sin( theta ).mul( cos( phi ) ),
    sin( theta ).mul( sin( phi ) ),
    cos( theta )
  );

} );


const perlinNoise3D = Fn( ( [ p ] ) => {

  const i = floor( p ).toVar();
  const f = fract( p ).toVar();

  const u = f.mul( f ).mul( float( 3.0 ).sub( f.mul( 2.0 ) ) );

  const g000 = randomGradient3D( i );
  const g100 = randomGradient3D( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const g010 = randomGradient3D( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const g110 = randomGradient3D( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const g001 = randomGradient3D( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const g101 = randomGradient3D( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const g011 = randomGradient3D( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const g111 = randomGradient3D( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

  const d000 = dot( g000, f );
  const d100 = dot( g100, f.sub( vec3( 1.0, 0.0, 0.0 ) ) );
  const d010 = dot( g010, f.sub( vec3( 0.0, 1.0, 0.0 ) ) );
  const d110 = dot( g110, f.sub( vec3( 1.0, 1.0, 0.0 ) ) );
  const d001 = dot( g001, f.sub( vec3( 0.0, 0.0, 1.0 ) ) );
  const d101 = dot( g101, f.sub( vec3( 1.0, 0.0, 1.0 ) ) );
  const d011 = dot( g011, f.sub( vec3( 0.0, 1.0, 1.0 ) ) );
  const d111 = dot( g111, f.sub( vec3( 1.0, 1.0, 1.0 ) ) );

  return mix(
    mix( mix( d000, d100, u.x ), mix( d010, d110, u.x ), u.y ),
    mix( mix( d001, d101, u.x ), mix( d011, d111, u.x ), u.y ),
    u.z
  ).add( 0.5 );

} );


// ─── Fractal Brownian Motion ──────────────────────────────────


function createFBM( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

  return Fn( ( [ p ] ) => {

    const value     = float( 0 ).toVar();
    const amplitude = float( 0.5 ).toVar();
    const frequency = float( 1 ).toVar();

    Loop( octaves, () => {
      value.addAssign( amplitude.mul( perlinNoise3D( p.mul( frequency ) ) ) );
      frequency.mulAssign( lacunarity );
      amplitude.mulAssign( gain );
    } );

    return value;

  } );

}


// ─── Ridged Noise ─────────────────────────────────────────────


function createRidgedNoise( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

  return Fn( ( [ p ] ) => {

    const value     = float( 0 ).toVar();
    const amplitude = float( 0.5 ).toVar();
    const frequency = float( 1 ).toVar();
    const weight    = float( 1 ).toVar();

    Loop( octaves, () => {
      const n      = oneMinus( abs( perlinNoise3D( p.mul( frequency ) ).sub( 0.5 ).mul( 2 ) ) );
      const signal = n.mul( n ).mul( weight );
      value.addAssign( signal.mul( amplitude ) );
      weight.assign( signal.clamp( 0, 1 ) );
      frequency.mulAssign( lacunarity );
      amplitude.mulAssign( gain );
    } );

    return value;

  } );

}


// ─── CPU-side 3D Perlin Noise ────────────────────────────────
// Plain JS versions of the same algorithms, for evaluating noise
// on the CPU (e.g. voxel placement decisions).


function cpuRandomGradient3D( px, py, pz ) {

  const phi   = ( Math.abs( Math.sin( px * 127.1 + py * 311.7 + pz * 74.7 ) * 43758.5453 ) % 1 ) * Math.PI * 2;
  const theta = ( Math.abs( Math.sin( px * 269.5 + py * 183.3 + pz * 246.1 ) * 43758.5453 ) % 1 ) * Math.PI;
  return [
    Math.sin( theta ) * Math.cos( phi ),
    Math.sin( theta ) * Math.sin( phi ),
    Math.cos( theta )
  ];

}


function cpuSmoothstep( t ) {
  return t * t * ( 3.0 - 2.0 * t );
}


function cpuLerp( a, b, t ) {
  return a + ( b - a ) * t;
}


function cpuDot3( a, b0, b1, b2 ) {
  return a[ 0 ] * b0 + a[ 1 ] * b1 + a[ 2 ] * b2;
}


function cpuPerlinNoise3D( x, y, z ) {

  const ix = Math.floor( x );
  const iy = Math.floor( y );
  const iz = Math.floor( z );

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = cpuSmoothstep( fx );
  const uy = cpuSmoothstep( fy );
  const uz = cpuSmoothstep( fz );

  const g000 = cpuRandomGradient3D( ix,     iy,     iz     );
  const g100 = cpuRandomGradient3D( ix + 1, iy,     iz     );
  const g010 = cpuRandomGradient3D( ix,     iy + 1, iz     );
  const g110 = cpuRandomGradient3D( ix + 1, iy + 1, iz     );
  const g001 = cpuRandomGradient3D( ix,     iy,     iz + 1 );
  const g101 = cpuRandomGradient3D( ix + 1, iy,     iz + 1 );
  const g011 = cpuRandomGradient3D( ix,     iy + 1, iz + 1 );
  const g111 = cpuRandomGradient3D( ix + 1, iy + 1, iz + 1 );

  const d000 = cpuDot3( g000, fx,       fy,       fz       );
  const d100 = cpuDot3( g100, fx - 1.0, fy,       fz       );
  const d010 = cpuDot3( g010, fx,       fy - 1.0, fz       );
  const d110 = cpuDot3( g110, fx - 1.0, fy - 1.0, fz       );
  const d001 = cpuDot3( g001, fx,       fy,       fz - 1.0 );
  const d101 = cpuDot3( g101, fx - 1.0, fy,       fz - 1.0 );
  const d011 = cpuDot3( g011, fx,       fy - 1.0, fz - 1.0 );
  const d111 = cpuDot3( g111, fx - 1.0, fy - 1.0, fz - 1.0 );

  return cpuLerp(
    cpuLerp( cpuLerp( d000, d100, ux ), cpuLerp( d010, d110, ux ), uy ),
    cpuLerp( cpuLerp( d001, d101, ux ), cpuLerp( d011, d111, ux ), uy ),
    uz
  ) + 0.5;

}


function createCpuFBM( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

  return function fbm( x, y, z ) {

    let value     = 0;
    let amplitude = 0.5;
    let frequency = 1;

    for ( let i = 0; i < octaves; i++ ) {
      value     += amplitude * cpuPerlinNoise3D( x * frequency, y * frequency, z * frequency );
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value;

  };

}


function createCpuRidgedNoise( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

  return function ridged( x, y, z ) {

    let value     = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let weight    = 1;

    for ( let i = 0; i < octaves; i++ ) {
      const raw    = cpuPerlinNoise3D( x * frequency, y * frequency, z * frequency );
      const n      = 1.0 - Math.abs( ( raw - 0.5 ) * 2.0 );
      const signal = n * n * weight;
      value     += signal * amplitude;
      weight     = Math.min( Math.max( signal, 0 ), 1 );
      frequency *= lacunarity;
      amplitude *= gain;
    }

    return value;

  };

}


// ─── Expose to sketch.js ─────────────────────────────────────
// (p5.js web editor doesn't support relative ES module imports,
//  so we bridge via window instead)


window.NoiseLib = { createFBM, createRidgedNoise, createCpuFBM, createCpuRidgedNoise };

