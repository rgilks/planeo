import { useEffect, useRef } from "react";
import { Vector3 } from "three";

import { EYE_Y_POSITION } from "@/domain/sceneConstants";
import { roundVec3, areVec3sEqual, roundArray } from "@/lib/utils";

import type { EyeUpdateType } from "@/domain";
import type { Camera } from "@react-three/fiber";

const FORCE_POSITION_UPDATE_INTERVAL_MS = 20000;
const LOCAL_INTERVAL_MS = 100;

export const useEyePositionReporting = (
  myId: string,
  myName: string | undefined,
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

    const userName = myName || myId;

    const initialPositionRaw: [number, number, number] = [
      camera.position.x,
      EYE_Y_POSITION,
      camera.position.z,
    ];
    const initialPositionRounded = roundVec3(initialPositionRaw);

    const lookAtDirection = new Vector3();
    camera.getWorldDirection(lookAtDirection);

    // If looking perfectly vertical, add a tiny horizontal offset for the initial payload
    if (
      Math.abs(lookAtDirection.x) < 0.001 &&
      Math.abs(lookAtDirection.z) < 0.001
    ) {
      lookAtDirection.x = 0.01; // Small non-zero component
      lookAtDirection.normalize(); // Keep it a unit vector
    }

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
      name: userName,
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

      // If looking perfectly vertical, add a tiny horizontal offset to ensure the lookAt point isn't co-linear (on XZ) with position
      if (
        Math.abs(currentLookAtDirection.x) < 0.001 &&
        Math.abs(currentLookAtDirection.z) < 0.001
      ) {
        currentLookAtDirection.x = 0.01; // Small non-zero component
        currentLookAtDirection.normalize(); // Keep it a unit vector for consistency if preferred
      }

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
          name: userName,
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
  }, [camera, myId, myName]);
};
