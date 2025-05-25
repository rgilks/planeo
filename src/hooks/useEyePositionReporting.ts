import { useEffect, useRef } from "react";
import { Vector3 } from "three";

import { roundVec3, areVec3sEqual, roundArray } from "@/lib/utils";

import type { EyeUpdateType } from "@/domain";
import type { Camera } from "@react-three/fiber";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;
const LOCAL_INTERVAL_MS = 100;

export const useEyePositionReporting = (
  myId: string,
  camera: Camera | undefined,
) => {
  const lastSentPositionRef = useRef<[number, number, number] | undefined>(
    undefined,
  );
  const lastSentLookAtRef = useRef<[number, number, number] | undefined>(
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

    const lookAtDirection = new Vector3();
    camera.getWorldDirection(lookAtDirection);
    const initialLookAtRaw: [number, number, number] = [
      camera.position.x + lookAtDirection.x,
      camera.position.y + lookAtDirection.y,
      camera.position.z + lookAtDirection.z,
    ];
    const initialLookAtRounded = roundArray(initialLookAtRaw) as [
      number,
      number,
      number,
    ];

    const initialPayload: EyeUpdateType = {
      type: "eyeUpdate",
      id: myId,
      p: initialPositionRounded,
      l: initialLookAtRounded,
      t: Date.now(),
    };
    navigator.sendBeacon?.("/api/events", JSON.stringify(initialPayload));
    lastSentPositionRef.current = initialPositionRounded;
    lastSentLookAtRef.current = initialLookAtRounded;
    forcePositionUpdateCounterRef.current = 0;

    const intervalId = setInterval(() => {
      const currentPositionRaw: [number, number, number] = [
        camera.position.x,
        camera.position.y,
        camera.position.z,
      ];
      const currentPositionRounded = roundVec3(currentPositionRaw);

      const currentLookAtDirection = new Vector3();
      camera.getWorldDirection(currentLookAtDirection);
      const currentLookAtRaw: [number, number, number] = [
        camera.position.x + currentLookAtDirection.x,
        camera.position.y + currentLookAtDirection.y,
        camera.position.z + currentLookAtDirection.z,
      ];
      const currentLookAtRounded = roundArray(currentLookAtRaw) as [
        number,
        number,
        number,
      ];

      forcePositionUpdateCounterRef.current += 1;

      const positionActuallyChanged = !areVec3sEqual(
        lastSentPositionRef.current,
        currentPositionRounded,
      );

      const lookAtActuallyChanged = !areVec3sEqual(
        lastSentLookAtRef.current,
        currentLookAtRounded,
      );

      const isTimeForForcePositionUpdate =
        forcePositionUpdateCounterRef.current >= checksPerForcePositionUpdate;

      if (
        positionActuallyChanged ||
        lookAtActuallyChanged ||
        isTimeForForcePositionUpdate
      ) {
        const payload: EyeUpdateType = {
          type: "eyeUpdate",
          id: myId,
          t: Date.now(),
        };
        if (positionActuallyChanged || isTimeForForcePositionUpdate) {
          payload.p = currentPositionRounded;
          lastSentPositionRef.current = currentPositionRounded;
        }
        if (lookAtActuallyChanged || isTimeForForcePositionUpdate) {
          payload.l = currentLookAtRounded;
          lastSentLookAtRef.current = currentLookAtRounded;
        }

        if (payload.p || payload.l) {
          navigator.sendBeacon?.("/api/events", JSON.stringify(payload));
        }

        if (isTimeForForcePositionUpdate) {
          forcePositionUpdateCounterRef.current = 0;
        }
      }
    }, LOCAL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [camera, myId]);
};
