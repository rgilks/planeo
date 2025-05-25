import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EventSchema,
  EyeUpdateType,
  ChatMessageEventType,
} from "@/domain/event";

import { useEyeStore } from "./eyeStore"; // Import the singular eyeStore

// Define listener types
type EyeUpdateEventListener = (event: EyeUpdateType) => void;
type ChatMessageEventListener = (event: ChatMessageEventType) => void;

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
    eyeUpdate: EyeUpdateEventListener[];
    chatMessage: ChatMessageEventListener[];
  };
  cachedEyeUpdates: EyeUpdateType[];
  eyes: EyeUpdateType[];
}

interface EventStoreActions {
  connect: () => void;
  disconnect: () => void;
  subscribeEyeUpdates: (callback: EyeUpdateEventListener) => () => void;
  subscribeChatMessageEvents: (
    callback: ChatMessageEventListener,
  ) => () => void;
  _handleMessage: (event: MessageEvent) => void;
  _handleError: (event: Event) => void;
}

export const useEventStore = create<EventStoreState & EventStoreActions>()(
  immer((set, get) => ({
    isConnected: false,
    lastError: null,
    eventSourceInstance: null,
    listeners: {
      eyeUpdate: [],
      chatMessage: [],
    },
    cachedEyeUpdates: [],
    eyes: [],

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

    subscribeChatMessageEvents: (callback: ChatMessageEventListener) => {
      set((state) => {
        state.listeners.chatMessage.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.chatMessage = state.listeners.chatMessage.filter(
            (cb) => cb !== callback,
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
          if (data.type === "eyeUpdate") {
            set((state) => {
              const eyeUpdate = data as EyeUpdateType;
              const existingEyeIndex = state.eyes.findIndex(
                (e) => e.id === eyeUpdate.id,
              );
              if (existingEyeIndex > -1) {
                state.eyes[existingEyeIndex] = eyeUpdate;
              } else {
                state.eyes.push(eyeUpdate);
              }
            });

            // Also update the legacy eyeStore for tests
            useEyeStore.getState().setEye(data as EyeUpdateType);

            if (get().listeners.eyeUpdate.length === 0) {
              // console.log("Caching eyeUpdate event, no listeners yet:", data);
              // set((state) => {
              //   state.cachedEyeUpdates.push(data as EyeUpdateType);
              // });
            } else {
              [...get().listeners.eyeUpdate].forEach((callback) =>
                callback(data as EyeUpdateType),
              );
            }
          } else if (data.type === "chatMessage") {
            [...get().listeners.chatMessage].forEach((callback) =>
              callback(data as ChatMessageEventType),
            );
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
