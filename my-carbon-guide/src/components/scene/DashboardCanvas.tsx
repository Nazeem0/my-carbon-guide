import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Background } from "./Background";
import { ProgressRing } from "./ProgressRing";

interface DashboardCanvasProps {
  percentage: number;
  todayKg: number;
  dailyGoal: number;
}

function CameraParallax() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Shift camera target on mousemove
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 0.6;
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 0.6;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  useFrame((state) => {
    // Smooth camera shift with lerp factor 0.05
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, mouse.current.x, 0.05);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, mouse.current.y + 0.5, 0.05); // Offset by 0.5 for layout
    state.camera.lookAt(0, 0.5, 0);
  });

  return null;
}

export function DashboardCanvas({ percentage, todayKg, dailyGoal }: DashboardCanvasProps) {
  return (
    <div className="absolute inset-0 h-screen w-screen bg-[#050d0a] z-0 overflow-hidden">
      <Canvas
        camera={{ fov: 60, position: [0, 0.5, 8] }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={["#050d0a"]} />
        
        {/* Lights */}
        <ambientLight intensity={0.4} color="#1D9E75" />
        <pointLight position={[0, 4, 4]} intensity={1.2} />

        {/* 3D Background components */}
        <Background />

        {/* Dynamic 3D Progress Ring */}
        <group position={[0, 0.5, 0]}>
          <ProgressRing
            percentage={percentage}
            todayKg={todayKg}
            dailyGoal={dailyGoal}
          />
        </group>

        {/* Interactive Mouse Parallax Effect */}
        <CameraParallax />
      </Canvas>
    </div>
  );
}
