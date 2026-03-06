# Shape of Noise

### *Nature-inspired procedural modeling with three.js*

Shape of Noise workshop introduced students to procedural modeling and animation in the browser using JavaScript and three.js, with a central focus on noise as a generative principle. Participants explored algorithms such as Perlin noise, Simplex noise, and related stochastic methods that are widely used to produce natural-looking variation and complexity in digital systems.

Procedural noise plays a foundational role in games, films, and visual effects, where it is used to generate terrains, clouds, water surfaces, fire, vegetation, textures, and large-scale environments without relying on manual modeling. By embedding controlled randomness into mathematical functions, noise allows designers and artists to simulate the irregularity, continuity, and richness of nature within otherwise rigid, discrete digital frameworks. It is one of the primary techniques through which “nature” is synthesized in contemporary computational media.

Students used three.js, a popular open-source JavaScript library for 3D graphics built on top of WebGL and WebGPU, to create real-time procedural models and animations that run directly in the browser on both desktop and mobile devices. Through code, they constructed abstracted representations of natural formations such as mountain ranges, rock strata, coastlines, clouds, and vegetation distributions, focusing on structure, behavior, and emergence rather than literal realism.

The goal of the workshop was for each participant to develop an animated or interactive procedural system that demonstrates how noise can be used as a design tool: shaping geometry, driving motion, modulating materials, or influencing spatial organization. The workshop emphasized experimentation, iteration, and the translation of natural phenomena into algorithmic form.


## Code Examples

- [Three.js Basics](https://editor.p5js.org/lukapiskorec/full/Zdva-QFeY) — Basic Three.js setup running inside the p5.js web editor, covering scene, camera, renderer, and simple mesh creation. Made to be extended with TSL functions (Threejs Shader Language).

- [Perlin noise icosahedron](https://editor.p5js.org/lukapiskorec/full/i-Y7Zgxat) — Icosahedron geometry with Perlin noise displacement map, implemented in Three.js with TSL.

- [Perlin noise heightmap](https://editor.p5js.org/lukapiskorec/full/WQ2yIk_qA) — square plane geometry with Perlin noise displacement map and gradient coloring, implemented in Three.js with TSL.

- [FMB + Ridged noise heightmap](https://editor.p5js.org/lukapiskorec/full/epPXzZ4zZ) — square plane geometry with FBM (Fractal Brownian Motion) and Ridged noise displacement maps, implemented in Three.js with TSL.

- [FMB voxel cloud](https://editor.p5js.org/lukapiskorec/full/zEOMeBurb) — 3D box grid with FBM (Fractal Brownian Motion) and Ridged noise threshold culling, implemented in Three.js with CPU noise versions and instanced meshes.

- [Random boxes](https://editor.p5js.org/lukapiskorec/full/GeJFDEqF9) — creates multiple box geometries at random locations, implemented in Three.js.

- [FMB voxel cloud - sphere](https://editor.p5js.org/lukapiskorec/full/Z-nD58RXR) — 3D box sphere with FBM (Fractal Brownian Motion) and Ridged noise threshold culling, implemented in Three.js with CPU noise versions and instanced meshes.

- [FMB + Ridged noise planets](https://editor.p5js.org/lukapiskorec/full/mv2ODcvBe) — two overlaping icosahedron planet geometries with FBM and Ridged noise displacement map, implemented in Three.js with TSL.


## References

- [10 Noise Functions For Three.js TSL Shaders](https://threejsroadmap.com/blog/10-noise-functions-for-threejs-tsl-shaders)

- [Fractal Brownian Motion](https://thebookofshaders.com/13/)



## Student WIPs

- [Maxime + Aegnus 01](https://editor.p5js.org/lukapiskorec/full/S9eXO6v5T)

- [Ivan + Max 01](https://editor.p5js.org/lukapiskorec/full/R4N85RqUW)

- [Romain + Sofia 01](https://editor.p5js.org/lukapiskorec/full/tlW3Oor82)

- [Nathan + Amelia 01](https://editor.p5js.org/lukapiskorec/full/gqz1EDTv2)


## Final student projects

- [Maxime + Aegnus](https://editor.p5js.org/lukapiskorec/full/V5-libfua)

- [Ivan + Max](https://editor.p5js.org/lukapiskorec/full/v54n_IsQj)

- [Romain + Sofia](https://editor.p5js.org/lukapiskorec/full/XloNWA1Gx)

- [Nathan + Amelia - part 1](https://editor.p5js.org/lukapiskorec/full/Uumyaf9eq)
- [Nathan + Amelia - part 2](https://editor.p5js.org/lukapiskorec/full/Of9U0_Hxd)

- [Rodolphe](https://editor.p5js.org/lukapiskorec/full/QaZw4kSjA)

- [Liam + Achille](https://editor.p5js.org/lukapiskorec/full/hKjogGt2w)

- [Alexandre + Tayeba + Xinyang](https://editor.p5js.org/lukapiskorec/full/cRuKWvZ8-) 


## Credits

Workshop was conducted by Luka Piskorec, a computational architect and co-founder of [{protocell:labs}](https://protocell.xyz/), with assistance from Jihed Guezguez and support from Tomi Erard, Floriane Coué and the TUMO Paris team. It took place over four days in March 2026 at [TUMO Paris - Center for Creative Technologies](https://paris.tumo.fr/) and [Forum des images](https://www.forumdesimages.fr/).