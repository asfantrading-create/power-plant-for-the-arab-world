// Shared PBR materials. `userData.tile` = metres covered by one texture repeat (used by primitives to scale UVs).
import * as THREE from 'three';
import * as T from './textures.js';

const S = (opts, tile) => { const m = new THREE.MeshStandardMaterial(opts); if (tile) m.userData.tile = tile; return m; };
const windowed = [];
const withWindows = (texs, opts, tile) => { const m = S({ map: texs.map, emissiveMap: texs.emissive, emissive: 0xffffff, emissiveIntensity: 0, ...opts }, tile); windowed.push(m); return m; };

export const M = {
  // ground
  sand: S({ map: T.sandTexture(), roughness: 1 }, 26),
  scrub: S({ map: T.scrubTexture(), roughness: 1 }, 26),
  grass: S({ map: T.grassTexture(), roughness: 1 }, 20),
  gravel: S({ map: T.gravelTexture(), roughness: 1 }, 5),
  sitePad: S({ map: T.sandTexture(), color: 0xb8b3a6, roughness: 1 }, 18),
  asphalt: S({ map: T.asphaltTexture(), roughness: .95 }, 8),
  concretePad: S({ map: T.concreteTexture('concretePad', '#b9bcc0'), roughness: .95 }, 8),
  rock: S({ color: 0x8c857a, roughness: 1 }),
  riprap: S({ map: T.riprapTexture(), roughness: 1 }, 12),
  coal: S({ map: T.coalTexture(), roughness: 1 }, 6),
  // structures
  concrete: S({ map: T.concreteTexture(), roughness: .9 }, 8),
  concreteDark: S({ map: T.concreteTexture('concreteDark', '#a7abb0'), roughness: .9 }, 8),
  claddingWhite: S({ map: T.claddingTexture('cladW', '#e4e7ea', '#9aa3aa'), bumpMap: T.claddingBump(), bumpScale: .03, roughness: .55, metalness: .15 }, 4),
  claddingGrey: S({ map: T.claddingTexture('cladG', '#9ba4ab', '#5f686e'), bumpMap: T.claddingBump(), bumpScale: .03, roughness: .55, metalness: .2 }, 4),
  claddingBlue: S({ map: T.claddingTexture('cladB', '#5f86a8', '#35546e'), bumpMap: T.claddingBump(), bumpScale: .03, roughness: .55, metalness: .2 }, 4),
  claddingSand: S({ map: T.claddingTexture('cladS', '#d9cfb4', '#a3987c'), bumpMap: T.claddingBump(), bumpScale: .03, roughness: .6, metalness: .1 }, 4),
  claddingGreen: S({ map: T.claddingTexture('cladGr', '#6f9c8a', '#3f6a5a'), bumpMap: T.claddingBump(), bumpScale: .03, roughness: .55, metalness: .2 }, 4),
  hallWhite: withWindows(T.hallTextures('hallW', '#dfe3e6', '#98a1a7'), { roughness: .6, metalness: .1 }, [16, 12]),
  hallGrey: withWindows(T.hallTextures('hallG', '#b7bec3', '#727b81'), { roughness: .6, metalness: .15 }, [16, 12]),
  hallBlue: withWindows(T.hallTextures('hallB', '#6a90b0', '#3d5c78'), { roughness: .6, metalness: .15 }, [16, 12]),
  office: withWindows(T.facadeTextures('office', '#ddd9d0', '#3b5b7a'), { roughness: .7 }, [24, 14.4]),
  officeDark: withWindows(T.facadeTextures('officeDark', '#8e969c', '#2d4459'), { roughness: .6 }, [24, 14.4]),
  roof: S({ color: 0x9aa1a7, roughness: .75, metalness: .2 }),
  roofDark: S({ color: 0x5b6369, roughness: .8, metalness: .2 }),
  steel: S({ color: 0x9aa5ad, metalness: .75, roughness: .35 }),
  steelDark: S({ color: 0x4d5760, metalness: .6, roughness: .5 }),
  steelGalv: S({ color: 0xb9c1c7, metalness: .85, roughness: .3 }),
  steelRed: S({ color: 0xa8382c, metalness: .5, roughness: .5 }),
  pipe: S({ color: 0xc3c9cd, metalness: .7, roughness: .35 }),
  pipeInsulated: S({ color: 0xdedede, metalness: .3, roughness: .6 }),
  pipeYellow: S({ color: 0xe8b83a, metalness: .4, roughness: .5 }),
  glass: S({ color: 0x8fc3e6, metalness: .2, roughness: .05, transparent: true, opacity: .5, envMapIntensity: 1.2 }),
  glassDark: S({ color: 0x24405a, metalness: .6, roughness: .1, envMapIntensity: 1.2 }),
  tankWhite: S({ color: 0xe9eaeb, roughness: .5, metalness: .25 }),
  tankSilver: S({ color: 0xd1d6da, roughness: .3, metalness: .75 }),
  tankSand: S({ color: 0xd8cbb0, roughness: .6, metalness: .15 }),
  transformer: S({ color: 0x6f7d6b, roughness: .55, metalness: .35 }),
  insulator: S({ color: 0x8a5a2b, roughness: .45, metalness: .1 }),
  stack: S({ map: T.stackTexture(), roughness: .85 }, [1, 1]),
  stackDark: S({ map: T.stackTexture('stackDark', '#8e9296'), roughness: .85 }, [1, 1]),
  pv: S({ map: T.pvTexture(), metalness: .05, roughness: .7, envMapIntensity: .25 }, [1.1, 2.2]),
  mirror: S({ color: 0xe8f0f7, metalness: 1, roughness: .04, envMapIntensity: 1.3 }),
  water: S({ color: 0x0f4468, metalness: .55, roughness: .1, normalMap: T.waterNormalTexture(), normalScale: new THREE.Vector2(.45, .45), envMapIntensity: 1.3 }, 30),
  waterLake: S({ color: 0x2b6f8f, metalness: .2, roughness: .15, normalMap: T.waterNormalTexture(), normalScale: new THREE.Vector2(.3, .3) }, 30),
  louvre: S({ map: T.louvreTexture(), roughness: .6, metalness: .3 }, 3),
  fence: S({ map: T.fenceTexture(), transparent: true, alphaTest: .35, side: THREE.DoubleSide, roughness: .6, metalness: .5 }, 2.5),
  red: S({ color: 0xc0392b, roughness: .55, metalness: .2 }),
  orange: S({ color: 0xd9822b, roughness: .55, metalness: .2 }),
  yellow: S({ color: 0xf2c94c, roughness: .55, metalness: .2 }),
  white: S({ color: 0xf1f3f5, roughness: .6 }),
  blue: S({ color: 0x2f6fa3, roughness: .55, metalness: .2 }),
  navy: S({ color: 0x1f3a52, roughness: .6, metalness: .2 }),
  dark: S({ color: 0x33393f, roughness: .8 }),
  black: S({ color: 0x15181b, roughness: .7 }),
  trunk: S({ color: 0x6b4a2b, roughness: .9 }),
  leaves: S({ color: 0x3f7a3a, roughness: .9, side: THREE.DoubleSide }),
  receiver: new THREE.MeshStandardMaterial({ color: 0x2b2b2b, emissive: 0xff8a2a, emissiveIntensity: 0, roughness: .6 }),
  lampGlass: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0, roughness: .3 }),
};
M.hallWhite.userData.tile = [16, 12]; M.hallGrey.userData.tile = [16, 12]; M.hallBlue.userData.tile = [16, 12];

/** Breaks visible texture repetition on large ground surfaces by blending three differently scaled samples. */
export function antiTile(mat) {
  mat.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
      #ifdef USE_MAP
        vec4 tA = texture2D( map, vMapUv );
        vec4 tB = texture2D( map, vMapUv * 0.37 + vec2( 0.13, 0.71 ) );
        vec4 tC = texture2D( map, vec2( -vMapUv.y, vMapUv.x ) * 1.9 );
        vec4 sampledDiffuseColor = mix( mix( tA, tB, 0.5 ), tC, 0.3 );
        diffuseColor *= sampledDiffuseColor;
      #endif
    `);
  };
  mat.customProgramCacheKey = () => 'antitile';
  return mat;
}
antiTile(M.sand); antiTile(M.scrub); antiTile(M.grass); antiTile(M.sitePad);

/** Night factor 0..1: lights the windows and lamps. */
export function setNight(f) {
  for (const m of windowed) m.emissiveIntensity = 1.4 * f;
  M.lampGlass.emissiveIntensity = 2 * f;
}
export function groundMaterial(biome) { return biome === 'green' ? M.grass : biome === 'scrub' ? M.scrub : M.sand; }
