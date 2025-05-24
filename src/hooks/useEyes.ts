"use client";
import { useMemo, useEffect } from "react";
import { z } from "zod";

import { EyeUpdateType, Vec3Schema } from "@/domain/event"; // Ensure path is correct
import { useEventStore } from "@/stores/eventStore";
import { useEyeStore } from "@/stores/eyeStore";

type Vec3 = z.infer<typeof Vec3Schema>;

const STALE_THRESHOLD_MS = 30000;
const CLEANUP_INTERVAL_MS = 5000;

export const useEyes = () => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToEyeUpdates = useEventStore((s) => s.subscribeEyeUpdates);
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setEyeInStore = useEyeStore((s) => s.setEye);
  const removeStaleEyesInStore = useEyeStore((s) => s.removeStaleEyes);
  const eyesFromStore = useEyeStore((s) => s.eyes);

  useEffect(() => {
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleEyeUpdate = (event: EyeUpdateType) => {
      if (event.p) {
        setEyeInStore(event);
      }
    };

    const unsubscribe = subscribeToEyeUpdates(handleEyeUpdate);
    return () => unsubscribe();
  }, [subscribeToEyeUpdates, setEyeInStore]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      removeStaleEyesInStore(STALE_THRESHOLD_MS);
    }, CLEANUP_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [removeStaleEyesInStore]);

  return useMemo(
    () =>
      Object.entries(eyesFromStore).map(
        ([id, v]) => [id, v.p] as [string, Vec3],
      ),
    [eyesFromStore],
  );
};
