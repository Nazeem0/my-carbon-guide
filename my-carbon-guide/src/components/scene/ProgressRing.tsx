import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Html } from "@react-three/drei";
import { useSpring, animated } from "@react-spring/three";
import * as THREE from "three";
import { getCarbonEquivalent } from "@/hooks/useCarbon";

interface ProgressRingProps {
  percentage: number;
  todayKg: number;
  dailyGoal: number;
}

export function ProgressRing({ percentage, todayKg, dailyGoal }: ProgressRingProps) {
  const outerRingRef = useRef<THREE.Mesh>(null);
  const innerRingRef = useRef<THREE.Mesh>(null);

  // Determine color based on percentage
  const color = useMemo(() => {
    if (percentage < 60) return "#1D9E75"; // green
    if (percentage < 85) return "#F59E0B"; // amber
    return "#EF4444"; // red
  }, [percentage]);

  // Infinite bobbing animation using react-spring
  const { yPosition } = useSpring({
    from: { yPosition: -0.08 },
    to: async (next) => {
      while (true) {
        await next({ yPosition: 0.08 });
        await next({ yPosition: -0.08 });
      }
    },
    config: { tension: 40, friction: 10 },
  });

  // Slowly rotate the outer ring on the Y axis
  useFrame(() => {
    if (outerRingRef.current) {
      outerRingRef.current.rotation.y += 0.003;
    }
    if (innerRingRef.current) {
      innerRingRef.current.rotation.y += 0.005; // Slightly faster for visual separation
    }
  });

  const thetaLength = useMemo(() => {
    return Math.max(0.01, Math.min(1.0, percentage / 100)) * 2 * Math.PI;
  }, [percentage]);

  const equivalentText = useMemo(() => {
    return getCarbonEquivalent(todayKg);
  }, [todayKg]);

  return (
    <animated.group position-y={yPosition}>
      {/* Glow Effect */}
      <pointLight position={[0, 0, 0.5]} color={color} intensity={1.5} distance={3} />

      {/* Outer torus ring (Background track) */}
      <mesh ref={outerRingRef}>
        <torusGeometry args={[1.4, 0.06, 16, 100]} />
        <meshStandardMaterial
          color="#111827"
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.5}
          metalness={0.8}
        />
      </mesh>

      {/* Progress arc (Filled portion) */}
      {/* We rotate it so it starts from the top (12 o'clock position) */}
      <mesh ref={innerRingRef} rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[1.405, 0.065, 16, 100, thetaLength]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.0}
          roughness={0.2}
          metalness={0.9}
        />
      </mesh>

      {/* Floating dynamic equivalent text below the ring */}
      <Text
        fontSize={0.15}
        color="#6B7280"
        position={[0, -2, 0]}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hJPg.woff"
      >
        {equivalentText}
      </Text>

      {/* Center 2D Display Overlay */}
      <Html center transform={false} distanceFactor={15} className="pointer-events-none">
        <div className="flex flex-col items-center justify-center text-center select-none" style={{ width: "200px" }}>
          <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
            {todayKg.toFixed(2)} <span className="text-lg font-medium text-gray-300">kg</span>
          </span>
          <span className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-widest">
            of {dailyGoal} kg goal
          </span>
          <span className="text-sm font-bold mt-1 drop-shadow-md" style={{ color }}>
            {Math.round(percentage)}%
          </span>
        </div>
      </Html>
    </animated.group>
  );
}
