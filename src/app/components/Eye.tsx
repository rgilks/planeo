"use client";
import React from "react";
import { Group } from "three";

import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";

interface EyeProps {
  eye: ManagedEye;
  groupRef: (el: Group | null) => void;
}

export const Eye = ({ eye, groupRef }: EyeProps) => {
  return (
    <group ref={groupRef} position={eye.position}>
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
    </group>
  );
};
