import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { EventSchema, SymbolEventType, EyeUpdateType } from "@/domain/event";

// Define listener types
type SymbolEventListener = (event: SymbolEventType) => void;
type EyeUpdateEventListener = (event: EyeUpdateType) => void;

// Augment the Window interface for the debug store
declare global {
  interface Window {
    __eventStore?: typeof useEventStore;
  }
}

interface EventStoreState {
  isConnected: boolean;
  lastError: string | null;
  eventSourceInstance: EventSource | null;
  listeners: {
    symbol: SymbolEventListener[];
    eyeUpdate: EyeUpdateEventListener[];
  };
  cachedEyeUpdates: EyeUpdateType[];
}

interface EventStoreActions {
  connect: () => void;
  disconnect: () => void;
  subscribeSymbolEvents: (callback: SymbolEventListener) => () => void;
  subscribeEyeUpdates: (callback: EyeUpdateEventListener) => () => void;
  _handleMessage: (event: MessageEvent) => void;
  _handleError: (event: Event) => void;
}

export const useEventStore = create<EventStoreState & EventStoreActions>()(
  immer((set, get) => ({
    isConnected: false,
    lastError: null,
    eventSourceInstance: null,
    listeners: {
      symbol: [],
      eyeUpdate: [],
    },
    cachedEyeUpdates: [],

    connect: () => {
      if (get().eventSourceInstance || get().isConnected) {
        console.log(
          "EventSource connection attempt skipped: already connected or connecting.",
        );
        return;
      }
      console.log("Attempting to connect to EventSource...");
      const es = new EventSource("/api/events");
      set({ eventSourceInstance: es, isConnected: false, lastError: null });

      es.onopen = () => {
        console.log("EventSource connected.");
        set({ isConnected: true, lastError: null });
      };
      es.onmessage = (event: MessageEvent) => get()._handleMessage(event);
      es.onerror = (event: Event) => get()._handleError(event);
    },

    disconnect: () => {
      const es = get().eventSourceInstance;
      if (es) {
        console.log("Disconnecting EventSource...");
        es.close();
        set({
          eventSourceInstance: null,
          isConnected: false,
        });
      }
    },

    subscribeSymbolEvents: (callback: SymbolEventListener) => {
      set((state) => {
        state.listeners.symbol.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.symbol = state.listeners.symbol.filter(
            (cb: SymbolEventListener) => cb !== callback,
          );
        });
      };
    },

    subscribeEyeUpdates: (callback: EyeUpdateEventListener) => {
      let dispatchedCache = false;
      set((state) => {
        state.listeners.eyeUpdate.push(callback);
        if (state.cachedEyeUpdates.length > 0) {
          // Deep clone events to prevent passing Immer proxies to setTimeout
          const cacheToDispatch = state.cachedEyeUpdates.map((event) =>
            JSON.parse(JSON.stringify(event)),
          );
          state.cachedEyeUpdates = []; // Clear original cache
          setTimeout(() => {
            console.log(
              `Dispatching ${cacheToDispatch.length} cached eye events to new subscriber.`,
            );
            cacheToDispatch.forEach((cachedEvent) => callback(cachedEvent));
          }, 0);
          dispatchedCache = true;
        }
      });

      if (dispatchedCache) {
        // console.log("Scheduled dispatch of cached eye events for new subscriber.");
      }

      return () => {
        set((state) => {
          state.listeners.eyeUpdate = state.listeners.eyeUpdate.filter(
            (cb: EyeUpdateEventListener) => cb !== callback,
          );
        });
      };
    },

    _handleMessage: (event: MessageEvent) => {
      try {
        const rawData = JSON.parse(event.data);
        const parsedEvent = EventSchema.safeParse(rawData);

        if (parsedEvent.success) {
          const data = parsedEvent.data;
          if (data.type === "symbol") {
            [...get().listeners.symbol].forEach((callback) =>
              callback(data as SymbolEventType),
            );
          } else if (data.type === "eyeUpdate") {
            if (get().listeners.eyeUpdate.length === 0) {
              console.log("Caching eyeUpdate event, no listeners yet:", data);
              set((state) => {
                state.cachedEyeUpdates.push(data as EyeUpdateType);
              });
            } else {
              [...get().listeners.eyeUpdate].forEach((callback) =>
                callback(data as EyeUpdateType),
              );
            }
          }
        } else {
          console.error(
            "Failed to parse general event:",
            parsedEvent.error.flatten(),
            "Data:",
            rawData,
          );
          set({ lastError: "Failed to parse event data" });
        }
      } catch (error) {
        console.error(
          "Error processing SSE message:",
          error,
          "Data:",
          event.data,
        );
        set({ lastError: "Error processing SSE message" });
      }
    },

    _handleError: (event: Event) => {
      console.error("EventSource encountered an error:", event);
      set((state) => {
        state.lastError = "EventSource connection error";
        state.isConnected = false;
        state.eventSourceInstance = null;
      });
    },
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__eventStore = useEventStore;
}
