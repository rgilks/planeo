"use client";

import { useEffect, useRef } from "react";

import { generateAiChatMessage } from "@/app/actions/generateMessage";
import { getAIAgents, isAIAgentId } from "@/domain/aiAgent";
import { useCommunicationStore } from "@/stores/communicationStore";

export const useAiChat = (myId: string) => {
  const messages = useCommunicationStore((s) => s.messages);
  const aiResponseInProgress = useRef(false);

  useEffect(() => {
    const agents = getAIAgents();
    if (agents.length === 0) {
      // No AI agents configured, so nothing to do
      return;
    }
    const respondingAgentId = agents[0].id; // First AI agent will respond

    if (messages.length === 0 || aiResponseInProgress.current) {
      return;
    }

    const lastMessage = messages[messages.length - 1];

    // Don't respond if AI is already thinking
    // Don't let AI respond to its own messages or other AI messages
    if (isAIAgentId(lastMessage.userId)) {
      return;
    }

    // Only trigger if the last message was from the human user (myId)
    if (lastMessage.userId !== myId) {
      return;
    }

    aiResponseInProgress.current = true;

    const timerId = setTimeout(
      async () => {
        console.log(
          `[AI Hook] Triggering AI response from agent: ${respondingAgentId}...`,
        );
        try {
          const currentChatHistory = [...messages];
          await generateAiChatMessage(currentChatHistory, respondingAgentId);
        } catch (error) {
          console.error("[AI Hook] Error getting AI response:", error);
        } finally {
          aiResponseInProgress.current = false;
        }
      },
      1500 + Math.random() * 1000,
    );

    return () => {
      clearTimeout(timerId);
    };
  }, [messages, myId]);
};
