import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function FloatingParticles({ step }: { step: number }) {
  const count = 300; // Reduced count for lighter mode
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  
  // Track mouse for parallax/repulsion
  const mouse = useRef(new THREE.Vector2());
  
  useEffect(() => {
    const onMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, []);

  const particles = useMemo(() => {
    const data = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 30;
      const z = (Math.random() - 0.5) * 30;
      
      const speed = 0.002 + Math.random() * 0.005;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      
      const vx = speed * Math.sin(phi) * Math.cos(theta);
      const vy = speed * Math.sin(phi) * Math.sin(theta);
      const vz = speed * Math.cos(phi);

      data.push({ x, y, z, vx, vy, vz, originalX: x, originalY: y });
    }
    return data;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    // Camera transition based on step
    const targetCameraPos = [
      new THREE.Vector3(0, 0.5, 8),    // Step 0
      new THREE.Vector3(2, -1, 6),     // Step 1: Pan right, lower
      new THREE.Vector3(-2, 1, 10),    // Step 2: Pan left, higher, further back
    ];
    
    const targetPos = targetCameraPos[step] || targetCameraPos[0];
    state.camera.position.lerp(targetPos, 0.03);
    state.camera.lookAt(0, 0, 0);

    // Update Particles
    particles.forEach((p, i) => {
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // Mouse repulsion (simple 2D projection approximation)
      const dx = p.x - mouse.current.x * 10;
      const dy = p.y - mouse.current.y * 10;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < 2) {
         p.x += dx * 0.01;
         p.y += dy * 0.01;
      }

      // Wrap around
      if (p.x > 15) p.x = -15;
      if (p.x < -15) p.x = 15;
      if (p.y > 15) p.y = -15;
      if (p.y < -15) p.y = 15;
      if (p.z > 15) p.z = -15;
      if (p.z < -15) p.z = 15;

      tempObject.position.set(p.x, p.y, p.z);
      
      // Color change based on step (using scale as a visual trick instead of individual colors for instanced mesh for performance)
      const targetScale = step === 1 ? 1.5 : 1.0;
      tempObject.scale.setScalar(THREE.MathUtils.lerp(tempObject.scale.x, targetScale, 0.05));
      
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null as any, null as any, count]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      {/* Darker green for light mode visibility */}
      <meshBasicMaterial color="#115e59" opacity={0.6} transparent /> 
    </instancedMesh>
  );
}
