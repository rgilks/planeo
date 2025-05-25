"use client";

import { useEffect, useRef } from "react";

import { generateAiChatMessage } from "@/app/actions/generateMessage";
import { useMessageStore } from "@/stores/messageStore";

export const AI_USER_ID = "🤖-ai-companion";

export const useAiChat = (myId: string) => {
  const messages = useMessageStore((s) => s.messages);
  const addMessage = useMessageStore((s) => s.addMessage); // We might not need this if action posts to /api/events
  const aiResponseInProgress = useRef(false);

  useEffect(() => {
    if (messages.length === 0 || aiResponseInProgress.current) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    // Don't respond to own messages or if AI is already thinking
    if (lastMessage.userId === AI_USER_ID || lastMessage.userId === myId) {
      // If the last message is from the current user, AI can respond.
      // If it's from the AI itself, it shouldn't respond to avoid loops.
      if (lastMessage.userId === AI_USER_ID) return;
    }

    // Only trigger if the last message was from the human user this AI is tied to.
    // This fulfills the "for each user there is a one AI user that runs in their browser"
    if (lastMessage.userId !== myId) {
      return;
    }

    aiResponseInProgress.current = true;

    // Simple throttle: wait a bit before AI responds
    const timerId = setTimeout(
      async () => {
        console.log("[AI Hook] Triggering AI response...");
        try {
          // Pass a copy of messages to avoid issues with mutations if store updates
          const currentChatHistory = [...messages];
          await generateAiChatMessage(currentChatHistory, AI_USER_ID);
        } catch (error) {
          console.error("[AI Hook] Error getting AI response:", error);
        } finally {
          aiResponseInProgress.current = false;
        }
      },
      1500 + Math.random() * 1000,
    ); // Respond after 1.5-2.5 seconds

    return () => {
      clearTimeout(timerId);
      // Potentially set aiResponseInProgress.current = false if request could be cancelled
    };
  }, [messages, myId, addMessage]); // addMessage removed as action handles posting
};
