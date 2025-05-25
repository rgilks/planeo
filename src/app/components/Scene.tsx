import { PointerLockControls, Grid, Html } from "@react-three/drei";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { nanoid } from "nanoid";
import { useRef, useState, useEffect } from "react";
import { Vector3 } from "three";

import {
  useEventSource,
  useInputThrottle,
  useEyePositionReporting,
} from "@/hooks";
import { Eyes } from "@components/Eyes";

// Basic keyboard state
const useKeyboardControls = () => {
  const keys = useRef<{ [key: string]: boolean }>({});
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) =>
      (keys.current[event.key.toLowerCase()] = true);
    const onKeyUp = (event: KeyboardEvent) =>
      (keys.current[event.key.toLowerCase()] = false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);
  return keys;
};

const CanvasContent = ({ myId }: { myId: string }) => {
  const { camera, gl } = useThree();
  useEyePositionReporting(myId, camera);
  const keyboard = useKeyboardControls();
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [showLockInstruction, setShowLockInstruction] = useState(true);

  // Camera movement parameters
  const moveSpeed = 0.5;
  const zoomSpeed = 0.5; // Used for W/S movement speed

  useFrame(() => {
    if (!isPointerLocked) return;

    const direction = new Vector3();
    camera.getWorldDirection(direction);

    let didMove = false;

    // Forward/backward movement (W/S/ArrowUp/ArrowDown)
    if (keyboard.current["w"] || keyboard.current["arrowup"]) {
      camera.position.addScaledVector(direction, zoomSpeed);
      didMove = true;
    }
    if (keyboard.current["s"] || keyboard.current["arrowdown"]) {
      camera.position.addScaledVector(direction, -zoomSpeed);
      didMove = true;
    }

    // Strafing movement (A/D/ArrowLeft/ArrowRight)
    const right = new Vector3();
    right.crossVectors(direction, camera.up).normalize(); // Calculate right vector (direction X up)

    if (keyboard.current["a"] || keyboard.current["arrowleft"]) {
      camera.position.addScaledVector(right, -moveSpeed);
      didMove = true;
    }
    if (keyboard.current["d"] || keyboard.current["arrowright"]) {
      camera.position.addScaledVector(right, moveSpeed);
      didMove = true;
    }

    // Keep camera above a certain y position (e.g., ground level + eye height)
    if (camera.position.y < 2) {
      // Adjust this minimum height as needed
      camera.position.y = 2;
      didMove = true;
    }

    if (didMove) {
      camera.updateProjectionMatrix(); // Important if camera properties change that affect projection
    }
  });

  return (
    <>
      {showLockInstruction && !isPointerLocked && (
        <Html center style={{ pointerEvents: "none" }}>
          <div
            style={{
              color: "white",
              fontSize: "20px",
              backgroundColor: "rgba(0,0,0,0.7)",
              padding: "10px 20px",
              borderRadius: "5px",
            }}
          >
            Click to look around
          </div>
        </Html>
      )}
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
      <PointerLockControls
        camera={camera}
        domElement={gl.domElement}
        onLock={() => {
          setIsPointerLocked(true);
          setShowLockInstruction(false);
        }}
        onUnlock={() => {
          setIsPointerLocked(false);
          setShowLockInstruction(true);
        }}
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
      camera={{ position: [0, 20, 120], near: 1, far: 2500, fov: 75 }}
      style={{ width: "100%", height: "100%" }}
      shadows
    >
      <color attach="background" args={["#000"]} />
      <CanvasContent myId={myId.current} />
    </Canvas>
  );
};

export default Scene;
