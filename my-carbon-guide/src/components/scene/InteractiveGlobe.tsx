import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function InteractiveGlobe({ step }: { step: number }) {
  const globeRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state, delta) => {
    if (globeRef.current) {
      // Base slow rotation
      globeRef.current.rotation.y += 0.0005;

      // Extra rotation if hovered
      if (hovered) {
        globeRef.current.rotation.y += 0.002;
      }

      // Animate scale/position based on step
      const targetScale = step === 2 ? 1.2 : 1;
      globeRef.current.scale.setScalar(
        THREE.MathUtils.lerp(globeRef.current.scale.x, targetScale, 0.05),
      );

      const targetZ = step === 2 ? -5 : -8;
      globeRef.current.position.z = THREE.MathUtils.lerp(
        globeRef.current.position.z,
        targetZ,
        0.05,
      );
    }
  });

  return (
    <mesh
      ref={globeRef}
      position={[0, 0, -8]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <sphereGeometry args={[6, 32, 32]} />
      <meshBasicMaterial
        wireframe
        color={hovered ? "#2DD4A0" : "#1D9E75"} // Brighten on hover
        opacity={0.15}
        transparent
      />
    </mesh>
  );
}
