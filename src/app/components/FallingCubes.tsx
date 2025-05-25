"use client";

import { Box } from "@react-three/drei";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import React, { useMemo } from "react";
import * as THREE from "three";

import { GROUND_Y_POSITION } from "@/domain/sceneConstants";

const CUBE_COUNT = 25;

interface CubeProps {
  position: [number, number, number];
  size: [number, number, number];
  color: THREE.ColorRepresentation;
}

const Cube = ({ position, size, color }: CubeProps) => (
  <RigidBody position={position} colliders="cuboid">
    <Box args={size}>
      <meshStandardMaterial color={color} />
    </Box>
  </RigidBody>
);

export const FallingCubes = () => {
  const cubes = useMemo(() => {
    const tempCubes: CubeProps[] = [];
    for (let i = 0; i < CUBE_COUNT; i++) {
      tempCubes.push({
        position: [
          (Math.random() - 0.5) * 40, // Spread around origin X
          GROUND_Y_POSITION + Math.random() * 10 + 10, // Start above the ground
          (Math.random() - 0.5) * 40, // Spread around origin Z
        ],
        size: [
          Math.random() * 2 + 15, // Size relative to eye radius (8 * 2 = 16)
          Math.random() * 2 + 15, // Size relative to eye radius (8 * 2 = 16)
          Math.random() * 2 + 15, // Size relative to eye radius (8 * 2 = 16)
        ],
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      });
    }
    return tempCubes;
  }, []);

  return (
    <>
      {cubes.map((cube, index) => (
        <Cube key={index} {...cube} />
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
