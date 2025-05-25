"use server";

import { v4 as uuidv4 } from "uuid";

import { getAIAgentById } from "@/domain/aiAgent";
import { Message } from "@/domain/message";

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
  console.log(
    `[AI Controller Action] Requesting decision for agent ${aiAgentId}`,
  );

  const decision = await generateAiActionAndChat(
    aiAgentId,
    imageDataUrl,
    chatHistory,
  );

  if (decision) {
    if (decision.chatMessage && decision.chatMessage.trim() !== "") {
      const agent = getAIAgentById(aiAgentId);
      const agentDisplayName = agent?.displayName || aiAgentId;
      const aiMessage: Message = {
        id: uuidv4(),
        userId: aiAgentId,
        name: agentDisplayName,
        text: decision.chatMessage.trim(),
        timestamp: Date.now(),
      };

      console.log(
        `[AI Controller Action] Broadcasting chat message from ${aiAgentId}: ${aiMessage.text}`,
      );
      //
      // IMPORTANT: Broadcasting directly from a server action to the SSE manager (`sseStore`)
      // requires `sseStore` to expose a function that can be called server-side.
      // The existing `broadcast` in `sseStore` is designed for the /api/events route context.
      // We will need to refactor or add a new broadcast mechanism.
      // For now, let's define a placeholder `broadcastEvent` and address its implementation next.
      //
      try {
        // This is a conceptual placeholder. `sseStore.ts` will need a compatible export.
        // await broadcastEvent({ ...aiMessage, type: "chatMessage" as const });

        // Alternative: Post to our own /api/events endpoint. More robust for separate concerns.
        const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
        if (appUrl) {
          fetch(`${appUrl}/api/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...aiMessage,
              type: "chatMessage" as const,
            }),
          }).catch((fetchError) => {
            console.error(
              `[AI Controller Action] Fetch to /api/events for chat broadcast failed for agent ${aiAgentId}:`,
              fetchError,
            );
          });
        } else {
          console.error(
            "[AI Controller Action] NEXT_PUBLIC_APP_URL is not defined. Cannot broadcast AI chat message.",
          );
        }
      } catch (broadcastError) {
        console.error(
          `[AI Controller Action] Error broadcasting chat message for ${aiAgentId}:`,
          broadcastError,
        );
      }
    }
    return decision.action;
  }

  console.warn(
    `[AI Controller Action] No decision returned from LLM for agent ${aiAgentId}. Returning no action.`,
  );
  return { type: "none" }; // Default to no action if something went wrong
};
