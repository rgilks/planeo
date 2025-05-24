"use client";
import { useFrame, useLoader } from "@react-three/fiber";
import { useRef, useEffect, useMemo } from "react";
import { Mesh, Vector3, Group, TextureLoader, ShaderMaterial } from "three";

import { EYE_Y_POSITION } from "@/domain/sceneConstants";
import { useEyes } from "@/hooks/useEyes";
import { useEyesStore } from "@/stores/eyesStore";
import { useSymbolStore } from "@/stores/symbolStore";

import { Eye } from "./Eye";

const SUN_POS = new Vector3(0, 0, 0);
const EYE_TEXTURE_PATH = "/eye.jpg";
const POSITION_UPDATE_THRESHOLD = 0.00001;

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
  const refs = useRef<Record<string, Mesh | Group>>({});
  const eyes = useEyes();
  const eyeTexture = useLoader(TextureLoader, EYE_TEXTURE_PATH);
  const remoteKeys = useSymbolStore((s) => s.remoteKeys);

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
    syncEyes(eyes, myId, baseShaderMaterial);
  }, [eyes, myId, baseShaderMaterial, syncEyes]);

  useFrame((_, delta) => {
    updateEyeAnimations(delta);

    const activeEyeIds = new Set(Object.keys(managedEyes));
    for (const refId in refs.current) {
      if (!activeEyeIds.has(refId)) {
        delete refs.current[refId];
      }
    }

    for (const id in managedEyes) {
      const eye = managedEyes[id];
      const group = refs.current[id];

      if (!group) continue;

      if (
        group.position.manhattanDistanceTo(eye.position) >
        POSITION_UPDATE_THRESHOLD
      ) {
        group.position.set(eye.position.x, EYE_Y_POSITION, eye.position.z);
      }
      group.lookAt(SUN_POS);

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
      {Object.values(managedEyes).map((eye) => (
        <Eye
          key={eye.id}
          eye={eye}
          remoteKey={remoteKeys[eye.id]}
          groupRef={(el) => {
            if (el) refs.current[eye.id] = el;
          }}
        />
      ))}
    </>
  );
};
