/*

Noise functions — CPU + TSL (GPU)

CPU section: plain JavaScript Perlin noise with FBM and Ridged layering,
used for voxel placement decisions.

TSL section: GPU-side 3D Perlin noise as TSL Fn nodes, used for real-time
vertex displacement on asteroid meshes.

@LukaPiskorec 2026

*/


import {
  Fn, float, vec3,
  floor, fract, sin, cos, dot, mix
} from 'three/tsl';


// ═════════════════════════════════════════════════════════════════
// CPU-side noise (plain JavaScript)
// ═════════════════════════════════════════════════════════════════


// ─── 3D Perlin Noise (base) ──────────────────────────────────


function cpuRandomGradient3D( px, py, pz ) {

  const phi   = ( Math.abs( Math.sin( px * 127.1 + py * 311.7 + pz * 74.7 ) * 43758.5453 ) % 1 ) * Math.PI * 2;
  const theta = ( Math.abs( Math.sin( px * 269.5 + py * 183.3 + pz * 246.1 ) * 43758.5453 ) % 1 ) * Math.PI;
  return [
    Math.sin( theta ) * Math.cos( phi ),
    Math.sin( theta ) * Math.sin( phi ),
    Math.cos( theta )
  ];

}


function smoothstep( t ) {
  return t * t * ( 3.0 - 2.0 * t );
}


function lerp( a, b, t ) {
  return a + ( b - a ) * t;
}


function dot3( a, b0, b1, b2 ) {
  return a[ 0 ] * b0 + a[ 1 ] * b1 + a[ 2 ] * b2;
}


function cpuPerlinNoise3D( x, y, z ) {

  const ix = Math.floor( x );
  const iy = Math.floor( y );
  const iz = Math.floor( z );

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = smoothstep( fx );
  const uy = smoothstep( fy );
  const uz = smoothstep( fz );

  const g000 = cpuRandomGradient3D( ix,     iy,     iz     );
  const g100 = cpuRandomGradient3D( ix + 1, iy,     iz     );
  const g010 = cpuRandomGradient3D( ix,     iy + 1, iz     );
  const g110 = cpuRandomGradient3D( ix + 1, iy + 1, iz     );
  const g001 = cpuRandomGradient3D( ix,     iy,     iz + 1 );
  const g101 = cpuRandomGradient3D( ix + 1, iy,     iz + 1 );
  const g011 = cpuRandomGradient3D( ix,     iy + 1, iz + 1 );
  const g111 = cpuRandomGradient3D( ix + 1, iy + 1, iz + 1 );

  const d000 = dot3( g000, fx,       fy,       fz       );
  const d100 = dot3( g100, fx - 1.0, fy,       fz       );
  const d010 = dot3( g010, fx,       fy - 1.0, fz       );
  const d110 = dot3( g110, fx - 1.0, fy - 1.0, fz       );
  const d001 = dot3( g001, fx,       fy,       fz - 1.0 );
  const d101 = dot3( g101, fx - 1.0, fy,       fz - 1.0 );
  const d011 = dot3( g011, fx,       fy - 1.0, fz - 1.0 );
  const d111 = dot3( g111, fx - 1.0, fy - 1.0, fz - 1.0 );

  return lerp(
    lerp( lerp( d000, d100, ux ), lerp( d010, d110, ux ), uy ),
    lerp( lerp( d001, d101, ux ), lerp( d011, d111, ux ), uy ),
    uz
  ) + 0.5;

}


// ─── Fractal Brownian Motion ──────────────────────────────────


function createFBM( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

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


// ─── Ridged Noise ─────────────────────────────────────────────


function createRidgedNoise( { octaves = 6, lacunarity = 2.0, gain = 0.5 } = {} ) {

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


// ═════════════════════════════════════════════════════════════════
// TSL noise (GPU-side, for vertex displacement)
// ═════════════════════════════════════════════════════════════════


// ─── 3D Perlin Noise (TSL) ───────────────────────────────────


const tslRandomGradient3D = Fn( ( [ p ] ) => {

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

  const g000 = tslRandomGradient3D( i );
  const g100 = tslRandomGradient3D( i.add( vec3( 1.0, 0.0, 0.0 ) ) );
  const g010 = tslRandomGradient3D( i.add( vec3( 0.0, 1.0, 0.0 ) ) );
  const g110 = tslRandomGradient3D( i.add( vec3( 1.0, 1.0, 0.0 ) ) );
  const g001 = tslRandomGradient3D( i.add( vec3( 0.0, 0.0, 1.0 ) ) );
  const g101 = tslRandomGradient3D( i.add( vec3( 1.0, 0.0, 1.0 ) ) );
  const g011 = tslRandomGradient3D( i.add( vec3( 0.0, 1.0, 1.0 ) ) );
  const g111 = tslRandomGradient3D( i.add( vec3( 1.0, 1.0, 1.0 ) ) );

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


// ─── Expose to sketch.js ─────────────────────────────────────


window.NoiseLib = { createFBM, createRidgedNoise, perlinNoise3D };
