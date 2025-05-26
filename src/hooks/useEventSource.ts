"use client";
import { useEffect } from "react";

import { type BoxEventType } from "@/domain";
import { useBoxStore } from "@/stores/boxStore";
import { useCommunicationStore } from "@/stores/communicationStore";
import { useEventStore } from "@/stores/eventStore";

import type { ChatMessageEventType } from "@/domain/event";

export const useEventSource = (myId: React.RefObject<string>) => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToChatMessageEvents = useEventStore(
    (s) => s.subscribeChatMessageEvents,
  );
  const subscribeToBoxEvents = useEventStore((s) => s.subscribeBoxEvents);
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const addMessage = useCommunicationStore((s) => s.addMessage);
  const handleBoxEventFromStore = useBoxStore((s) => s.handleBoxEvent);

  useEffect(() => {
    // Attempt to connect to the EventSource when the hook mounts
    // if not already connected.
    if (!eventSourceConnected) {
      connectToEventSource();
    }
  }, [connectToEventSource, eventSourceConnected]);

  useEffect(() => {
    const handleChatMessageEvent = (event: ChatMessageEventType) => {
      console.log("[EventSource Hook] Received chat message event:", event);
      console.log("[EventSource Hook] Current myId:", myId.current);
      if (event.userId === myId.current) {
        console.log("[EventSource Hook] Ignoring own message.");
        return;
      }
      console.log("[EventSource Hook] Adding message to store:", event);
      addMessage(event);
    };

    const unsubscribeChat = subscribeToChatMessageEvents(
      handleChatMessageEvent,
    );
    return () => unsubscribeChat();
  }, [subscribeToChatMessageEvents, addMessage, myId]);

  useEffect(() => {
    const handleBoxEvent = (event: BoxEventType) => {
      handleBoxEventFromStore(event);
    };

    const unsubscribeBox = subscribeToBoxEvents(handleBoxEvent);
    return () => unsubscribeBox();
  }, [subscribeToBoxEvents, handleBoxEventFromStore]);
};
