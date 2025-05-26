import { enableMapSet } from "immer";
import { Vector3, Euler, MathUtils } from "three";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  type BoxEventType,
  type ValidatedBoxUpdatePayloadType,
} from "@/domain";

enableMapSet(); // Enable Map and Set support for Immer

export interface AnimatedBoxState {
  id: string;
  // Current animated values
  currentP: Vector3;
  currentO: Euler; // Using Three.js Euler for easier lerping
  // Target values from server
  targetP: Vector3;
  targetO: Euler;
  // Other state
  c: string; // Color
  t: number; // Timestamp of last target update
  isInitialized: boolean; // To handle initial snap
}

interface BoxStoreState {
  boxes: Map<string, AnimatedBoxState>;
  handleBoxEvent: (boxData: BoxEventType) => void;
  updateBoxAnimations: (delta: number, lerpFactor?: number) => void;
  optimisticallySetBoxState: (update: ValidatedBoxUpdatePayloadType) => void;
}

const DEFAULT_LERP_FACTOR = 0.1;

export const useBoxStore = create<BoxStoreState>()(
  immer((set) => ({
    boxes: new Map(),

    handleBoxEvent: (boxData) => {
      if (!boxData || !boxData.p || !boxData.o || !boxData.c) {
        console.warn(
          "[Client boxStore] Received incomplete boxData, ignoring:",
          boxData,
        );
        return;
      }

      set((state) => {
        const existingBox = state.boxes.get(boxData.id);
        const targetPosition = new Vector3(...boxData.p);
        const targetOrientation = new Euler(
          boxData.o[0],
          boxData.o[1],
          boxData.o[2],
          existingBox?.currentO.order || "XYZ",
        );

        if (existingBox) {
          existingBox.targetP.copy(targetPosition);
          existingBox.targetO.copy(targetOrientation);
          existingBox.c = boxData.c;
          existingBox.t = boxData.t;
        } else {
          state.boxes.set(boxData.id, {
            id: boxData.id,
            currentP: targetPosition.clone(),
            currentO: targetOrientation.clone(),
            targetP: targetPosition.clone(),
            targetO: targetOrientation.clone(),
            c: boxData.c,
            t: boxData.t,
            isInitialized: true,
          });
        }
      });
    },

    updateBoxAnimations: (delta, lerpFactor = DEFAULT_LERP_FACTOR) => {
      set((state) => {
        // Adjust lerpFactor based on delta to aim for frame-rate independence
        // This aims to achieve roughly the same visual speed as lerpFactor at 60FPS
        const adjustedLerpFactor = Math.min(lerpFactor * delta * 60, 1);

        for (const box of state.boxes.values()) {
          if (!box.currentP.equals(box.targetP)) {
            box.currentP.lerp(box.targetP, adjustedLerpFactor);
          }
          if (!box.currentO.equals(box.targetO)) {
            box.currentO.x = MathUtils.lerp(
              box.currentO.x,
              box.targetO.x,
              adjustedLerpFactor,
            );
            box.currentO.y = MathUtils.lerp(
              box.currentO.y,
              box.targetO.y,
              adjustedLerpFactor,
            );
            box.currentO.z = MathUtils.lerp(
              box.currentO.z,
              box.targetO.z,
              adjustedLerpFactor,
            );
          }
        }
      });
    },

    optimisticallySetBoxState: (update) => {
      set((state) => {
        const box = state.boxes.get(update.id);
        if (box) {
          if (update.p) {
            const newPos = new Vector3(...update.p);
            box.currentP.copy(newPos);
            box.targetP.copy(newPos);
          }
          if (update.o) {
            // Ensure Euler order is consistent, using existing order or default 'XYZ'
            const newEuler = new Euler(
              update.o[0],
              update.o[1],
              update.o[2],
              box.currentO.order || "XYZ",
            );
            box.currentO.copy(newEuler);
            box.targetO.copy(newEuler);
          }
          box.t = Date.now(); // Update timestamp for this optimistic update
        }
      });
    },
  })),
);
