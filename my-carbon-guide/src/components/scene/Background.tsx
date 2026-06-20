import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Background() {
  const count = 500;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const globeRef = useRef<THREE.Mesh>(null);

  const tempObject = useMemo(() => new THREE.Object3D(), []);

  // Initialize random particle positions and velocities
  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      // Random position in range [-15, 15]
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;

      // Slow drift speed (random velocity 0.001 - 0.005)
      const speed = 0.001 + Math.random() * 0.004;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      data.push({ x, y, z, vx, vy, vz });
    }
    return data;
  }, []);

  useFrame(() => {
    // 1. Update Particle Field
    if (meshRef.current) {
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        // Wrap around when particle goes out of [-15, 15] range
        if (p.x > 15) p.x = -15;
        if (p.x < -15) p.x = 15;
        if (p.y > 15) p.y = -15;
        if (p.y < -15) p.y = 15;
        if (p.z > 15) p.z = -15;
        if (p.z < -15) p.z = 15;

        tempObject.position.set(p.x, p.y, p.z);
        tempObject.updateMatrix();
        meshRef.current!.setMatrixAt(i, tempObject.matrix);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Slow Y rotation of Wireframe Earth Globe
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      {/* 500 particle instanced mesh */}
      <instancedMesh
        ref={meshRef}
        args={[
          undefined as unknown as THREE.BufferGeometry,
          undefined as unknown as THREE.Material,
          count,
        ]}
      >
        <sphereGeometry args={[0.025, 4, 4]} />
        <meshBasicMaterial color="#1D9E75" />
      </instancedMesh>

      {/* Wireframe Earth globe */}
      <mesh ref={globeRef} position={[0, 0, -8]}>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial wireframe color="#1D9E75" opacity={0.05} transparent />
      </mesh>
    </group>
  );
}
