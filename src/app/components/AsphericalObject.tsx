"use client";

import { Torus } from "@react-three/drei";
import { RigidBody, TrimeshCollider } from "@react-three/rapier"; // Assuming TrimeshCollider for complex shapes
import React from "react";
import * as THREE from "three";

const ASPHERICAL_OBJECT_POSITION: [number, number, number] = [0, 5, -30]; // Example position
const ASPHERICAL_OBJECT_COLOR = "purple";

export const AsphericalObject = () => {
  // It's often necessary to create a THREE.BufferGeometry from the desired shape
  // to use with TrimeshCollider if a direct TorusCollider isn't available or suitable.
  // For simplicity, we'll use a placeholder for trimesh args here.
  // In a real scenario, you'd generate these from the Torus geometry.
  const torusGeometry = new THREE.TorusGeometry(5, 1.5, 16, 100);
  const vertices = torusGeometry.attributes.position.array;
  const indices = torusGeometry.index?.array || new Uint32Array(0); // Handle potential null index

  return (
    <RigidBody
      position={ASPHERICAL_OBJECT_POSITION}
      type="fixed" // Or "dynamic" if it should react to physics
      colliders={false} // We will define custom collider(s)
      name="asphericalObjectTarget" // Unique name for identification
    >
      <Torus args={[5, 1.5, 16, 100]} castShadow receiveShadow>
        <meshStandardMaterial color={ASPHERICAL_OBJECT_COLOR} />
      </Torus>
      {/* For a torus, a TrimeshCollider is a common choice, or multiple convex hulls for better performance */}
      {indices.length > 0 && <TrimeshCollider args={[vertices, indices]} />}
    </RigidBody>
  );
};
