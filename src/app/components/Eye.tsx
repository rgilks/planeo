"use client";
import React from "react";
import { Group } from "three";

import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";

interface EyeProps {
  eye: ManagedEye;
  groupRef: (el: Group | null) => void;
  // position?: Vector3; // Unused prop
  // lookAt?: Vector3; // Unused prop
  // isCurrentUser?: boolean; // Unused prop
}

export const Eye = ({
  eye,
  groupRef,
}: // position, // Unused prop
// lookAt, // Unused prop
// isCurrentUser, // Unused prop
EyeProps) => {
  // const eyeRef = useRef<Group>(null!); // Unused ref

  // useEffect(() => { // This useEffect was for the unused props
  //   if (eyeRef.current && position) {
  //     console.log(
  //       `[Eye.tsx] Updating eye ${eye.id}. New Position:`,
  //       position.toArray(),
  //       "LookAt:",
  //       lookAt?.toArray()
  //     );
  //     eyeRef.current.position.copy(position);
  //     if (lookAt) {
  //       eyeRef.current.lookAt(lookAt);
  //     } else {
  //       const defaultLookAt = new Vector3()
  //         .copy(position)
  //         .add(new Vector3(0, 0, -1));
  //       eyeRef.current.lookAt(defaultLookAt);
  //     }
  //   }
  // }, [eye.id, position, lookAt]);

  return (
    <group ref={groupRef} position={eye.position}>
      {" "}
      {/* Use eye.position directly */}
      <mesh rotation={[0, 0, 0]}>
        {" "}
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
    </group>
  );
};
