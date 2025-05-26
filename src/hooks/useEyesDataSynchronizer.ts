"use client";

// import { useLoader } from "@react-three/fiber"; // REMOVED
import { useEffect, useMemo, useState } from "react";
import { TextureLoader, ShaderMaterial, Texture } from "three";

import { EyeUpdateType } from "@/domain/event"; // Ensure this path is correct
import { useEyesStore } from "@/stores/eyesStore";
import { useRawEyeEventStore } from "@/stores/rawEyeEventStore";

// Copied from Eyes.tsx, consider moving to a shared location if used elsewhere
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
    if (vNormal.z < -0.85) color = vec3(0.777, 0.74, 0.74); // Iris color part
    gl_FragColor = vec4(color, uOpacity);
  }
`;

export const useEyesDataSynchronizer = (myId: string) => {
  const rawEyesData = useRawEyeEventStore((state) => state.eyes);
  const { syncEyes } = useEyesStore.getState();
  const [eyeTexture, setEyeTexture] = useState<Texture | null>(null);

  useEffect(() => {
    const loader = new TextureLoader();
    loader.load(
      EYE_TEXTURE_PATH,
      (texture) => {
        setEyeTexture(texture);
      },
      undefined, // onProgress callback (optional)
      (error) => {
        console.error("An error happened loading the eye texture:", error);
      },
    );
  }, []); // Empty dependency array, load once

  const baseShaderMaterial = useMemo(() => {
    if (!eyeTexture) return null;
    return new ShaderMaterial({
      uniforms: {
        tex: { value: eyeTexture },
        uOpacity: { value: 1.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
    });
  }, [eyeTexture]);

  useEffect(() => {
    if (!baseShaderMaterial) {
      // Do not sync if the material isn't ready.
      // This also implies eyeTexture hasn't loaded yet.
      return;
    }

    const transformedDataArray: EyeUpdateType[] = Object.entries(
      rawEyesData,
    ).map(([id, data]) => ({
      type: "eyeUpdate" as const,
      id,
      p: data.p,
      l: data.l,
      t: data.t,
    }));
    // syncEyes will be called even if transformedDataArray is empty,
    // allowing eyesStore to clear out eyes if rawEyesData becomes empty.
    syncEyes(transformedDataArray, myId, baseShaderMaterial);
  }, [rawEyesData, myId, baseShaderMaterial, syncEyes]);
};
