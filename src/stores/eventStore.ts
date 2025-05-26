import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { type BoxEventType } from "@/domain";
import {
  BoxUpdatePayloadSchema,
  type ValidatedBoxUpdatePayloadType,
} from "@/domain/box";
import {
  EventSchema,
  EyeUpdateType,
  ChatMessageEventType,
} from "@/domain/event";
import { throttle } from "@/lib/utils";

import { useBoxStore } from "./boxStore";
import { useEyeStore } from "./eyeStore";

// Define listener types
type EyeUpdateEventListener = (event: EyeUpdateType) => void;
type ChatMessageEventListener = (event: ChatMessageEventType) => void;
type BoxEventListener = (event: BoxEventType) => void;

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
    box: BoxEventListener[];
  };
  cachedEyeUpdates: EyeUpdateType[];
  eyes: EyeUpdateType[];
  throttledSendBoxUpdate: (
    boxUpdate: ValidatedBoxUpdatePayloadType,
  ) => Promise<void>;
}

interface EventStoreActions {
  connect: () => void;
  disconnect: () => void;
  subscribeEyeUpdates: (callback: EyeUpdateEventListener) => () => void;
  subscribeChatMessageEvents: (
    callback: ChatMessageEventListener,
  ) => () => void;
  subscribeBoxEvents: (callback: BoxEventListener) => () => void;
  sendBoxUpdate: (boxUpdate: ValidatedBoxUpdatePayloadType) => Promise<void>;
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
      box: [],
    },
    cachedEyeUpdates: [],
    eyes: [],
    throttledSendBoxUpdate: throttle(
      async (boxUpdate: ValidatedBoxUpdatePayloadType) => {
        if (!get().isConnected) {
          console.warn(
            "Attempted to send box update while not connected. Ignoring.",
          );
          return;
        }

        const parsedPayload = BoxUpdatePayloadSchema.safeParse(boxUpdate);
        if (!parsedPayload.success) {
          console.error(
            "Invalid box update payload before sending:",
            parsedPayload.error.flatten(),
          );
          set({ lastError: "Invalid box update payload formation" });
          return;
        }

        try {
          const response = await fetch("/api/events", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(parsedPayload.data),
          });

          if (!response.ok) {
            const errorData = await response.text();
            console.error(
              "Failed to send box update to server:",
              response.status,
              errorData,
            );
            set({
              lastError: `Server error sending box update: ${response.status}`,
            });
          } else {
          }
        } catch (error) {
          console.error("Network error sending box update:", error);
          set({ lastError: "Network error sending box update" });
        }
      },
      300,
    ),

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
          const cacheToDispatch = state.cachedEyeUpdates.map((event) =>
            JSON.parse(JSON.stringify(event)),
          );
          state.cachedEyeUpdates = [];
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

    subscribeBoxEvents: (callback: BoxEventListener) => {
      set((state) => {
        state.listeners.box.push(callback);
      });
      return () => {
        set((state) => {
          state.listeners.box = state.listeners.box.filter(
            (cb) => cb !== callback,
          );
        });
      };
    },

    sendBoxUpdate: async (boxUpdate: ValidatedBoxUpdatePayloadType) => {
      useBoxStore.getState().optimisticallySetBoxState(boxUpdate);
      get().throttledSendBoxUpdate(boxUpdate);
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

            useEyeStore.getState().setEye(data as EyeUpdateType);

            if (get().listeners.eyeUpdate.length === 0) {
            } else {
              [...get().listeners.eyeUpdate].forEach((callback) =>
                callback(data as EyeUpdateType),
              );
            }
          } else if (data.type === "chatMessage") {
            [...get().listeners.chatMessage].forEach((callback) =>
              callback(data as ChatMessageEventType),
            );
          } else if (data.type === "box") {
            const boxEvent = data as BoxEventType;
            [...get().listeners.box].forEach((callback) => callback(boxEvent));
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
