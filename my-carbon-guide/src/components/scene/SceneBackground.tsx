import { Canvas } from "@react-three/fiber";
import { DistortionBackground } from "./DistortionBackground";

export function SceneBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ alpha: true, antialias: false }}
        dpr={[1, 1.5]}
        style={{ background: "transparent" }}
      >
        <DistortionBackground />
      </Canvas>
    </div>
  );
}
