"use client";
// import { Text } from "@react-three/drei"; // Removed for diagnostics
import React from "react";
import { Group, Vector3 } from "three";

// import { SYMBOLS } from "@/domain"; // Removed for diagnostics
import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";
import { RemoteKeyState } from "@/stores/symbolStore";

// const GREEN = "#00FF41"; // Removed for diagnostics
// const TEXT_FADE_DURATION_MS = 2000; // Removed for diagnostics

// const getSymbol = (key: string) => { ... }; // Removed for diagnostics

interface EyeProps {
  eye: ManagedEye;
  remoteKey?: RemoteKeyState["remoteKeys"][string];
  groupRef: (el: Group | null) => void;
  position?: Vector3;
}

export const Eye = ({
  eye,
  // remoteKey, // Commented out to avoid unused var lint error for now
  groupRef,
  position,
  ...props
}: EyeProps) => {
  return (
    <group ref={groupRef} position={position || eye.position} {...props}>
      <mesh rotation={[0, 0, 0]}>
        {" "}
        {/* Current mesh rotation from previous step */}
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
      {/* Text component removed for diagnostics */}
    </group>
  );
};
