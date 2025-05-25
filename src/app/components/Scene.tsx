import { OrbitControls, Grid } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { nanoid } from "nanoid";
import { useRef } from "react";

import {
  useEventSource,
  useInputThrottle,
  useEyePositionReporting,
} from "@/hooks";
import { Eyes } from "@components/Eyes";

const CanvasContent = ({ myId }: { myId: string }) => {
  const { camera } = useThree();
  useEyePositionReporting(myId, camera);

  return (
    <>
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.05}
          luminanceSmoothing={0.2}
          intensity={0.5}
        />
      </EffectComposer>
      <group>
        <ambientLight intensity={0.08} />
        <Eyes myId={myId} />
        <directionalLight
          position={[100, 100, 100]}
          intensity={6}
          color={"#fffbe6"}
          castShadow
          shadow-mapSize-width={8192}
          shadow-mapSize-height={8192}
          shadow-bias={-0.001}
          shadow-camera-near={1}
          shadow-camera-far={2000}
          shadow-camera-left={-1000}
          shadow-camera-right={1000}
          shadow-camera-top={1000}
          shadow-camera-bottom={-1000}
          target-position={[0, 0, 0]}
        />
      </group>
      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.4}
        zoomSpeed={0.4}
        minDistance={40}
        maxDistance={400}
        onStart={() => {}}
        onEnd={() => {}}
      />
      <Grid
        position={[0, -20 + 0.01, 0]}
        args={[1000, 1000]}
        cellSize={10}
        cellThickness={1}
        cellColor={"green"}
        sectionSize={100}
        sectionThickness={1.5}
        sectionColor={"green"}
        fadeDistance={2000}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />
    </>
  );
};

const Scene = () => {
  const myId = useRef(nanoid(6));

  useEventSource(myId);
  useInputThrottle(myId);

  return (
    <Canvas
      camera={{ position: [0, 20, 120], near: 1, far: 2500 }}
      style={{ width: "100%", height: "100%" }}
      shadows
    >
      <color attach="background" args={["#000"]} />
      <CanvasContent myId={myId.current} />
    </Canvas>
  );
};

export default Scene;
