export const synapseVertexShader = /* glsl */ `
  attribute float aProgress;
  attribute float aSeed;

  varying float vProgress;
  varying float vSeed;

  void main() {
    vProgress = aProgress;
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const synapseFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uSpeed;
  uniform float uIntensity;
  uniform float uBaseOpacity;

  varying float vProgress;
  varying float vSeed;

  void main() {
    // A bright pulse travels 0->1 along each edge, looping, with a per-edge phase
    // offset (vSeed) so the whole network doesn't fire in lockstep — reads as
    // asynchronous synapse activity instead of a single scanning wave.
    float head = fract(uTime * uSpeed + vSeed);
    float dist = abs(vProgress - head);
    dist = min(dist, 1.0 - dist);
    float pulse = smoothstep(0.16, 0.0, dist);

    vec3 baseColor = uColor * uBaseOpacity;
    vec3 pulseColor = uColor * pulse * (1.6 + uIntensity);

    gl_FragColor = vec4(baseColor + pulseColor, uBaseOpacity * 1.4 + pulse * 0.85);
  }
`;
