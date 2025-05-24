import { useEffect, useRef } from "react";

import { roundVec3, areVec3sEqual } from "@/lib/utils";

import type { EyeUpdateType } from "@/domain";
import type { Camera } from "@react-three/fiber";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;
const LOCAL_INTERVAL_MS = 2000;

export const useEyePositionReporting = (
  myId: string,
  camera: Camera | undefined,
) => {
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );
  const forcePositionUpdateCounterRef = useRef(0);

  useEffect(() => {
    if (!camera) return;

    const checksPerForcePositionUpdate =
      FORCE_POSITION_UPDATE_INTERVAL_MS / LOCAL_INTERVAL_MS;

    const initialPositionRaw: [number, number, number] = [
      camera.position.x,
      camera.position.y,
      camera.position.z,
    ];
    const initialPositionRounded = roundVec3(initialPositionRaw);
    const initialPayload: EyeUpdateType = {
      type: "eyeUpdate",
      id: myId,
      p: initialPositionRounded,
      t: Date.now(),
    };
    navigator.sendBeacon?.("/api/events", JSON.stringify(initialPayload));
    lastSentPositionRef.current = initialPositionRounded;
    forcePositionUpdateCounterRef.current = 0;

    const intervalId = setInterval(() => {
      const currentPositionRaw: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const currentPositionRounded = roundVec3(currentPositionRaw);

      forcePositionUpdateCounterRef.current += 1;

      const positionActuallyChanged = !areVec3sEqual(
        lastSentPositionRef.current,
        currentPositionRounded,
      );
      const isTimeForForcePositionUpdate =
        forcePositionUpdateCounterRef.current >= checksPerForcePositionUpdate;

      if (positionActuallyChanged || isTimeForForcePositionUpdate) {
        const payload: EyeUpdateType = {
          type: "eyeUpdate",
          id: myId,
          p: currentPositionRounded,
          t: Date.now(),
        };
        navigator.sendBeacon?.("/api/events", JSON.stringify(payload));
        lastSentPositionRef.current = currentPositionRounded;
        forcePositionUpdateCounterRef.current = 0;
      }
    }, LOCAL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [camera, myId]);
};
