"use server";

import { generateAiActionAndChat, type ChatHistory } from "./generateMessage";

import type { ParsedAIResponse } from "@/domain/aiAction";

// Helper to broadcast chat messages
// This might need to be adjusted based on how sseStore is structured for direct server-side broadcast
// For now, let's assume a function `broadcastEvent` exists in sseStore.
// If not, we'll need to create it or use an alternative mechanism (e.g., an internal fetch to /api/events).

export const requestAiDecision = async (
  aiAgentId: string,
  imageDataUrl: string,
  chatHistory: ChatHistory,
): Promise<ParsedAIResponse["action"]> => {
  const decision = await generateAiActionAndChat(
    aiAgentId,
    imageDataUrl,
    chatHistory,
  );

  if (decision) {
    return decision.action;
  }

  console.warn(
    `[AI Controller Action] No decision returned from LLM for agent ${aiAgentId}. Returning no action.`,
  );
  return { type: "none" }; // Default to no action if something went wrong
};
