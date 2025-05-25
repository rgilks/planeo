"use client";
import {
  RigidBody,
  BallCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import React from "react";

import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";

interface EyeProps {
  eye: ManagedEye;
  rigidBodyRef: React.RefObject<RapierRigidBody | null>;
}

export const Eye = ({ eye, rigidBodyRef }: EyeProps) => {
  return (
    <RigidBody
      ref={rigidBodyRef}
      colliders="ball"
      type="kinematicPosition"
      position={eye.position}
    >
      <BallCollider args={[EYE_RADIUS]} />
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
    </RigidBody>
  );
};
