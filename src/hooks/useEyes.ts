"use client";
import { useMemo, useEffect } from "react";

import { EyeUpdateType as EventEyeUpdateType } from "@/domain/event";
import { EyeUpdateType as DomainEyeUpdateType } from "@/domain/eye";
import { useEventStore } from "@/stores/eventStore";
import { useEyeStore } from "@/stores/eyeStore";

const STALE_THRESHOLD_MS = 30000;
const CLEANUP_INTERVAL_MS = 5000;

export const useEyes = (): DomainEyeUpdateType[] => {
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
    const handleEyeUpdate = (event: EventEyeUpdateType) => {
      if (event.p || event.l) {
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
      Object.entries(eyesFromStore).map(([id, data]) => ({
        type: "eyeUpdate" as const,
        id,
        p: data.p as [number, number, number] | undefined,
        l: data.l as [number, number, number] | undefined,
        t: data.t,
      })),
    [eyesFromStore],
  );
};
