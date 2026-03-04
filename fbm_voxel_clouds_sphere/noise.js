/*

CPU-side noise functions (plain JavaScript)

Same algorithms as the TSL versions in other examples, but running on the
CPU so we can evaluate noise values in JavaScript to make voxel placement
decisions.

Provides a base 3D Perlin noise and two layered noise types built on top:
  - Fractal Brownian Motion (FBM): smooth, organic clouds
  - Ridged Noise: sharp creases and ridge-like formations

@LukaPiskorec 2026

*/


// ─── 3D Perlin Noise (base) ──────────────────────────────────


function randomGradient3D( px, py, pz ) {

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


function perlinNoise3D( x, y, z ) {

  const ix = Math.floor( x );
  const iy = Math.floor( y );
  const iz = Math.floor( z );

  const fx = x - ix;
  const fy = y - iy;
  const fz = z - iz;

  const ux = smoothstep( fx );
  const uy = smoothstep( fy );
  const uz = smoothstep( fz );

  const g000 = randomGradient3D( ix,     iy,     iz     );
  const g100 = randomGradient3D( ix + 1, iy,     iz     );
  const g010 = randomGradient3D( ix,     iy + 1, iz     );
  const g110 = randomGradient3D( ix + 1, iy + 1, iz     );
  const g001 = randomGradient3D( ix,     iy,     iz + 1 );
  const g101 = randomGradient3D( ix + 1, iy,     iz + 1 );
  const g011 = randomGradient3D( ix,     iy + 1, iz + 1 );
  const g111 = randomGradient3D( ix + 1, iy + 1, iz + 1 );

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
      value     += amplitude * perlinNoise3D( x * frequency, y * frequency, z * frequency );
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
      const raw    = perlinNoise3D( x * frequency, y * frequency, z * frequency );
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


window.NoiseLib = { createFBM, createRidgedNoise };
