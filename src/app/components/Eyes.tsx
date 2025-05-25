"use client";
import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { Group, TextureLoader, ShaderMaterial, Vector3 } from "three";

import { EYE_Y_POSITION } from "@/domain/sceneConstants";
import { useEyes } from "@/hooks/useEyes";
import { useEyesStore, ManagedEye } from "@/stores/eyesStore";
// import { useSymbolStore } from "@/stores/symbolStore"; // Commented out as it's not used now

import { Eye } from "./Eye";

const EYE_TEXTURE_PATH = "/eye.jpg";

const vertexShader = `
  precision mediump float;
  varying vec3 vNormal;
  void main() {
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision mediump float;
  uniform sampler2D tex;
  uniform float uOpacity;
  varying vec3 vNormal;
  void main() {
    vec2 uv = normalize(vNormal).xy * 0.5 + 0.5;
    vec3 color = texture2D(tex, uv).rgb;
    if (vNormal.z < -0.85) color = vec3(0.777, 0.74, 0.74);
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export const Eyes = ({ myId }: { myId: string }) => {
  const refs = useRef<Record<string, Group>>({});
  const eyesData = useEyes();
  const eyeTexture = useLoader(TextureLoader, EYE_TEXTURE_PATH);
  // const remoteKeys = useSymbolStore((s) => s.remoteKeys); // Commented out as it's not used now

  const managedEyes = useEyesStore((s) => s.managedEyes);
  const syncEyes = useEyesStore((s) => s.syncEyes);
  const updateEyeAnimations = useEyesStore((s) => s.updateEyeAnimations);

  const baseShaderMaterial = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: {
          tex: { value: eyeTexture },
          uOpacity: { value: 1.0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
      }),
    [eyeTexture],
  );

  useEffect(() => {
    syncEyes(eyesData, myId, baseShaderMaterial);
  }, [eyesData, myId, baseShaderMaterial, syncEyes]);

  useFrame((_, delta) => {
    updateEyeAnimations(delta);

    const activeEyeIds = new Set(Object.keys(managedEyes));
    for (const refId in refs.current) {
      if (!activeEyeIds.has(refId)) {
        delete refs.current[refId];
      }
    }

    for (const id in managedEyes) {
      const eye: ManagedEye = managedEyes[id];
      const group = refs.current[id];

      if (!group) continue;

      group.position.set(eye.position.x, EYE_Y_POSITION, eye.position.z);

      if (id !== myId && eye.lookAt) {
        // All console.log statements related to debugging pitch/yaw will be removed here.
      }

      if (eye.lookAt && !eye.lookAt.equals(group.position)) {
        const targetDirection = new Vector3();
        targetDirection.subVectors(eye.lookAt, group.position);
        targetDirection.normalize();

        const tdx = targetDirection.x;
        const tdy = targetDirection.y;
        const tdz = targetDirection.z;

        let yaw = Math.atan2(tdx, tdz);
        yaw += Math.PI; // Add 180 degrees to yaw to flip direction

        const horizontalDist = Math.sqrt(tdx * tdx + tdz * tdz);

        let pitch = 0;
        if (horizontalDist > 0.0001) {
          pitch = Math.atan2(-tdy, horizontalDist);
        } else {
          pitch = tdy > 0 ? -Math.PI / 2 : Math.PI / 2;
        }

        group.rotation.set(pitch, yaw, 0, "YXZ");

        // Revert to Object3D.lookAt(), ensuring up vector is explicitly set.
        group.up.set(0, 1, 0);
        group.lookAt(eye.lookAt);
      } else {
        // Fallback orientation
        group.up.set(0, 1, 0); // Also set up for fallback
        const fallbackTarget = group.position.clone().add(new Vector3(0, 0, 1)); // Look along +Z
        group.lookAt(fallbackTarget);
      }

      // Opacity and scale updates
      if (eye.material.uniforms["uOpacity"].value !== eye.opacity) {
        eye.material.uniforms["uOpacity"].value = eye.opacity;
      }
      if (group.scale.x !== eye.scale) {
        group.scale.set(eye.scale, eye.scale, eye.scale);
      }
    }
  });

  return (
    <>
      {Object.values(managedEyes).map((eye: ManagedEye) => (
        <Eye
          key={eye.id}
          eye={eye}
          // remoteKey={remoteKeys[eye.id]}
          groupRef={(el) => {
            if (el) refs.current[eye.id] = el;
          }}
        />
      ))}
    </>
  );
};
