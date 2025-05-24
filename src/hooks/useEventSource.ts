"use client";
import { useEffect } from "react";

import { useEventStore } from "@/stores/eventStore";
import { useSymbolStore } from "@/stores/symbolStore";

import type { SymbolEventType } from "@/domain/event"; // Ensure path and type name are correct
import type { State as SymbolState } from "@/stores/symbolStore";

export const useEventSource = (myId: React.RefObject<string>) => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToSymbolEvents = useEventStore((s) => s.subscribeSymbolEvents);
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const setRemoteKey = useSymbolStore((s: SymbolState) => s.setRemoteKey);

  useEffect(() => {
    // Attempt to connect to the EventSource when the hook mounts
    // if not already connected.
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleSymbolEvent = (event: SymbolEventType) => {
      if (event.id !== myId.current) {
        setRemoteKey(event.id, event.key);
      }
    };

    const unsubscribe = subscribeToSymbolEvents(handleSymbolEvent);
    return () => unsubscribe();
  }, [subscribeToSymbolEvents, myId, setRemoteKey]);
};
