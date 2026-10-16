import * as THREE from "three";
import { FACE_TESSELATION } from "./canonicalFace";

/** Number of real-face landmarks; point i of the head model == landmark i (see faceModel.ts). */
export const FACE_LANDMARKS = 468;

/**
 * FACE_TESSELATION lists every triangle as three consecutive edges (a,b)(b,c)(c,a), so triangle t
 * is (T[6t], T[6t+1], T[6t+3]).
 */
function buildTriangleIndex(): Uint16Array {
  const tris: number[] = [];
  for (let k = 0; k + 5 < FACE_TESSELATION.length; k += 6) {
    tris.push(FACE_TESSELATION[k], FACE_TESSELATION[k + 1], FACE_TESSELATION[k + 3]);
  }
  return Uint16Array.from(tris);
}

export function createSkinGeometry(): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FACE_LANDMARKS * 3), 3));
  g.setIndex(new THREE.BufferAttribute(buildTriangleIndex(), 1));
  return g;
}

/**
 * Holographic skin: a lit, dotted surface over the real face mesh. Warm on her left, cool on her
 * right, with a rim light on the silhouette so the face reads as a volume instead of a wireframe.
 * Additive, so it only ever adds light on top of the synapse points and lines.
 */
export function createSkinMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uWarm: { value: new THREE.Color("#ff8a2e") },
      uCool: { value: new THREE.Color("#5b7cff") },
      uAlpha: { value: 0 },
      uTime: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vPos = position;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uWarm;
      uniform vec3 uCool;
      uniform float uAlpha;
      uniform float uTime;
      varying vec3 vN;
      varying vec3 vView;
      varying vec3 vPos;
      void main() {
        vec3 n = normalize(vN);
        vec3 v = normalize(vView);
        // Winding of the tessellation is not guaranteed: always shade the side facing the camera.
        if (dot(n, v) < 0.0) n = -n;
        float ndv = clamp(dot(n, v), 0.0, 1.0);

        float duo = smoothstep(-0.08, 0.32, vPos.x);
        vec3 tint = mix(uWarm, uCool, duo);

        // Key light from the warm side, soft fill from the cool side: gives cheekbones, nose and brow their form.
        float keyL = clamp(dot(n, normalize(vec3(-0.55, 0.45, 0.7))), 0.0, 1.0);
        float keyR = clamp(dot(n, normalize(vec3(0.6, 0.2, 0.7))), 0.0, 1.0);
        float key = mix(keyL, keyR, duo);
        float form = 0.11 + 0.8 * pow(key, 1.4) + 0.1 * ndv;

        float rim = pow(1.0 - ndv, 2.2);

        // Fine dotted skin grain + a slow scan shimmer.
        vec2 g = fract(vPos.xy * 78.0) - 0.5;
        float grain = 0.3 + 1.1 * smoothstep(0.46, 0.12, length(g));
        float shimmer = 0.9 + 0.1 * sin(vPos.y * 160.0 - uTime * 1.4);

        vec3 col = tint * (form * grain * shimmer * 0.78 + rim * 1.2);
        col += vec3(1.0, 0.92, 0.85) * pow(key, 7.0) * 0.10; // soft specular on the lit planes
        gl_FragColor = vec4(col * uAlpha, 1.0);
      }
    `,
  });
}
