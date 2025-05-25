"use client";
import React from "react";
import { Group, Vector3 } from "three";

import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";

interface EyeProps {
  eye: ManagedEye;
  groupRef: (el: Group | null) => void;
  position?: Vector3;
}

export const Eye = ({ eye, groupRef, position, ...props }: EyeProps) => {
  return (
    <group ref={groupRef} position={position || eye.position} {...props}>
      <mesh rotation={[0, 0, 0]}>
        {" "}
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
    </group>
  );
};
