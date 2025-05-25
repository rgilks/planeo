import { ShaderMaterial, Vector3 } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EyeState,
  EyeStatus,
  INITIAL_SCALE,
  TARGET_SCALE,
  FADE_DURATION,
  EyeUpdateType,
} from "@/domain/eye"; // Assuming path, adjust if necessary
import { EYE_Y_POSITION } from "@/domain/sceneConstants";

type EyesState = {
  managedEyes: Record<string, EyeState>;
};

type EyesActions = {
  syncEyes: (
    eyes: EyeUpdateType[],
    myId: string,
    baseShaderMaterial: ShaderMaterial,
  ) => void;
  updateEyeAnimations: (delta: number) => void;
  removeEye: (id: string) => void;
  setManyManagedEyes: (newEyes: Record<string, EyeState>) => void;
};

export type { EyeState as ManagedEye };

export const useEyesStore = create<EyesState & EyesActions>()(
  immer((set) => ({
    managedEyes: {},

    syncEyes: (eyes, myId, baseShaderMaterial) =>
      set((state) => {
        const incomingEyeIds = new Set(eyes.map((eye) => eye.id));

        for (const eyeData of eyes) {
          if (eyeData.id === myId) continue;

          const existingEye = state.managedEyes[eyeData.id];

          if (existingEye) {
            console.log(
              `[eyesStore.syncEyes] Found existingEye for ${eyeData.id}:`,
              JSON.stringify(existingEye),
            );
            if (
              !existingEye.targetPosition ||
              !(existingEye.targetPosition instanceof Vector3)
            ) {
              console.error(
                `[eyesStore.syncEyes] ERROR: existingEye.targetPosition is problematic for ${eyeData.id}:`,
                existingEye.targetPosition,
              );
            }

            if (eyeData.p) {
              const positionVec = new Vector3(...eyeData.p);
              positionVec.y = EYE_Y_POSITION;
              existingEye.targetPosition.copy(positionVec);
            }
            if (eyeData.l) {
              const lookAtVec = new Vector3(...eyeData.l);
              existingEye.targetLookAt.copy(lookAtVec);
            }
            if (eyeData.name) {
              existingEye.name = eyeData.name;
            }
            if (existingEye.status === "disappearing") {
              existingEye.status = "appearing";
            }
          } else {
            const positionVec = eyeData.p
              ? new Vector3(...eyeData.p)
              : new Vector3();
            positionVec.y = EYE_Y_POSITION;
            const lookAtVec = eyeData.l
              ? new Vector3(...eyeData.l)
              : new Vector3(0, EYE_Y_POSITION, 1);
            state.managedEyes[eyeData.id] = {
              id: eyeData.id,
              name: eyeData.name,
              position: positionVec.clone(),
              targetPosition: positionVec.clone(),
              lookAt: lookAtVec.clone(),
              targetLookAt: lookAtVec.clone(),
              opacity: 0,
              scale: INITIAL_SCALE,
              status: "appearing" as EyeStatus,
              material: baseShaderMaterial.clone(),
            };
          }
        }

        for (const id in state.managedEyes) {
          if (id === myId) continue;
          if (!incomingEyeIds.has(id)) {
            if (state.managedEyes[id].status !== "disappearing") {
              state.managedEyes[id].status = "disappearing";
            }
          }
        }
      }),

    updateEyeAnimations: (delta) =>
      set((state) => {
        let changed = false;
        for (const id in state.managedEyes) {
          const eye = state.managedEyes[id];

          if (!eye.position.equals(eye.targetPosition)) {
            eye.position.lerp(eye.targetPosition, 0.05);
            eye.position.y = EYE_Y_POSITION;
            changed = true;
          }

          if (!eye.lookAt.equals(eye.targetLookAt)) {
            eye.lookAt.lerp(eye.targetLookAt, 0.05);
            changed = true;
          }

          if (eye.status === "appearing") {
            eye.opacity += delta / FADE_DURATION;
            eye.scale =
              INITIAL_SCALE +
              (TARGET_SCALE - INITIAL_SCALE) * Math.min(eye.opacity, 1);

            if (eye.opacity >= 1) {
              eye.opacity = 1;
              eye.scale = TARGET_SCALE;
              eye.status = "visible";
            }
            changed = true;
          } else if (eye.status === "disappearing") {
            eye.opacity -= delta / FADE_DURATION;
            eye.scale =
              INITIAL_SCALE +
              (TARGET_SCALE - INITIAL_SCALE) * Math.max(eye.opacity, 0);

            if (eye.opacity <= 0) {
              delete state.managedEyes[id];
              changed = true;
              continue;
            }
            changed = true;
          }
        }
        if (!changed) {
          return;
        }
      }),

    removeEye: (id: string) =>
      set((state) => {
        delete state.managedEyes[id];
      }),

    setManyManagedEyes: (newEyes) =>
      set((state) => {
        state.managedEyes = newEyes;
      }),
  })),
);
