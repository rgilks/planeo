"use client";
import { Text } from "@react-three/drei";
import React from "react";
import { Group, Vector3 } from "three";

import { SYMBOLS } from "@/domain";
import { EYE_RADIUS } from "@/domain/sceneConstants";
import { ManagedEye } from "@/stores/eyesStore";
import { RemoteKeyState } from "@/stores/symbolStore";

const GREEN = "#00FF41";
const TEXT_FADE_DURATION_MS = 2000;

const getSymbol = (key: string) => {
  const code = key.codePointAt(0) || 0;
  return SYMBOLS[code % SYMBOLS.length];
};

interface EyeProps {
  eye: ManagedEye;
  remoteKey?: RemoteKeyState["remoteKeys"][string];
  groupRef: (el: Group | null) => void;
  position?: Vector3;
}

export const Eye = ({
  eye,
  remoteKey,
  groupRef,
  position,
  ...props
}: EyeProps) => {
  return (
    <group ref={groupRef} position={position || eye.position} {...props}>
      <mesh>
        <sphereGeometry args={[EYE_RADIUS, 32, 32]} />
        <primitive object={eye.material} attach="material" />
      </mesh>
      {remoteKey &&
        remoteKey.key &&
        Date.now() - remoteKey.ts < TEXT_FADE_DURATION_MS && (
          <Text
            position={[0, EYE_RADIUS + 6, 0]}
            fontSize={10}
            color={GREEN}
            anchorX="center"
            anchorY="middle"
            fillOpacity={
              eye.opacity *
              (1 - (Date.now() - remoteKey.ts) / TEXT_FADE_DURATION_MS)
            }
            outlineColor="black"
            outlineWidth={0.25}
          >
            {getSymbol(remoteKey.key)}
          </Text>
        )}
    </group>
  );
};
