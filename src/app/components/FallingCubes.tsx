"use client";

import { Box } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import React from "react";
import * as THREE from "three";

import { GROUND_Y_POSITION } from "@/domain/sceneConstants";
import { useBoxStore, type BoxState } from "@/stores/boxStore";

export const ServerDrivenBoxes = () => {
  const boxesMap = useBoxStore(
    (state: { boxes: Map<string, BoxState> }) => state.boxes,
  );
  const serverBoxes: BoxState[] = Array.from(boxesMap.values());

  console.log(
    "[Client ServerDrivenBoxes] Rendering from boxesMap. Size:",
    boxesMap.size,
    "Array for render:",
    serverBoxes,
  );

  return (
    <>
      {serverBoxes.map((box: BoxState) => (
        <RigidBody
          key={box.id}
          position={box.p}
          rotation={box.o}
          colliders="cuboid"
        >
          <Box args={[15, 15, 15]}>
            <meshStandardMaterial color={new THREE.Color(box.c)} />
          </Box>
        </RigidBody>
      ))}
      {/* Ground Plane */}
      <RigidBody type="fixed" colliders="cuboid">
        <CuboidCollider
          args={[1000, 0.1, 1000]}
          position={[0, GROUND_Y_POSITION - 0.05, 0]}
        />
      </RigidBody>
    </>
  );
};
