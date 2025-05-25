"use client";
import { useEffect } from "react";

import { useEventStore } from "@/stores/eventStore";
import { useMessageStore } from "@/stores/messageStore";

import type { ChatMessageEventType } from "@/domain/event";

export const useEventSource = (myId: React.RefObject<string>) => {
  const connectToEventSource = useEventStore((s) => s.connect);
  const subscribeToChatMessageEvents = useEventStore(
    (s) => s.subscribeChatMessageEvents,
  );
  const eventSourceConnected = useEventStore((s) => s.isConnected);

  const addMessage = useMessageStore((s) => s.addMessage);

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
};
