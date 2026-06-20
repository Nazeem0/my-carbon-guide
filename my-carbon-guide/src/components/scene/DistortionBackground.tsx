import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform float uAmplitude;

varying vec2 vUv;
varying float vElevation;

void main() {
  vUv = uv;
  vec3 pos = position;

  float dx = pos.x - uMouse.x;
  float dy = pos.y - uMouse.y;
  float dist = sqrt(dx * dx + dy * dy);
  float wave = sin(dist * 4.0 - uTime * 2.0) * 0.5 + 0.5;
  float influence = 1.0 - smoothstep(0.0, 2.0, dist);
  float elevation = wave * influence * uAmplitude;

  pos.z += elevation;
  vElevation = elevation;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform vec2 uMouse;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;

varying vec2 vUv;
varying float vElevation;

void main() {
  float d = distance(vUv, uMouse);
  float glow = exp(-d * 4.0);

  vec3 col = mix(uColor1, uColor2, vUv.x * 0.6 + vElevation * 0.4);
  col = mix(col, uColor3, vElevation * 0.8 + 0.2);
  col += vec3(0.3, 0.6, 0.4) * glow * 0.3;

  float alpha = 0.4 + vElevation * 0.3 + glow * 0.15;

  gl_FragColor = vec4(col, alpha);
}
`;

export function DistortionBackground() {
  const meshRef = useRef<THREE.Mesh>(null);
  const mouse = useRef(new THREE.Vector2(0.5, 0.5));
  const targetMouse = useRef(new THREE.Vector2(0.5, 0.5));

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uAmplitude: { value: 0.4 },
      uColor1: { value: new THREE.Color("#059669") },
      uColor2: { value: new THREE.Color("#1D9E75") },
      uColor3: { value: new THREE.Color("#34D399") },
    }),
    [],
  );

  useFrame((state, delta) => {
    targetMouse.current.x = state.pointer.x * 0.5 + 0.5;
    targetMouse.current.y = state.pointer.y * 0.5 + 0.5;

    mouse.current.x += (targetMouse.current.x - mouse.current.x) * 0.05;
    mouse.current.y += (targetMouse.current.y - mouse.current.y) * 0.05;

    uniforms.uTime.value += delta * 0.5;
    uniforms.uMouse.value.set(mouse.current.x, mouse.current.y);
  });

  return (
    <mesh ref={meshRef} rotation={[-0.1, 0, 0]} position={[0, 0, -0.5]}>
      <planeGeometry args={[8, 12, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
