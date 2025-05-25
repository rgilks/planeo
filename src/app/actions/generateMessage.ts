"use server";

import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { Message, MessageSchema } from "@/domain/message";

let genAIClient: GoogleGenAI | null = null;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ChatHistorySchema = z.array(MessageSchema);
export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export const getGoogleAIClient = async (): Promise<GoogleGenAI> => {
  if (genAIClient) {
    return genAIClient;
  }

  const apiKey = process.env["GOOGLE_AI_API_KEY"]!;

  console.log("[GoogleAI Client] Initializing GoogleGenAI client...");
  try {
    genAIClient = new GoogleGenAI({ apiKey });
    return genAIClient;
  } catch (error) {
    console.error(
      "[GoogleAI Client] Failed to initialize GoogleGenAI client:",
      error,
    );
    throw error;
  }
};

export const getActiveModel = async () => {
  return {
    provider: "google",
    name: "gemini-2.0-flash-lite",
    displayName: "Gemini 2.0 Flash-Lite",
    maxTokens: 500,
  };
};

export type AIConfigOverrides = Partial<GenerationConfig>;

export async function callAIForStory(
  prompt: string,
  configOverrides?: AIConfigOverrides,
): Promise<string | undefined> {
  console.log("[AI Service] Calling AI...");

  const genAI: GoogleGenAI = await getGoogleAIClient();

  const baseConfig: GenerationConfig = {
    temperature: 1.0,
    topP: 0.95,
    topK: 40,
    frequencyPenalty: 0.3,
    presencePenalty: 0.6,
    candidateCount: 1,
    maxOutputTokens: 150,
  };

  const generationConfig = { ...baseConfig, ...configOverrides };

  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
    },
  ];

  const request = {
    model: "gemini-2.0-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    safetySettings,
  };

  const result = await genAI.models.generateContent(request);

  const text = result.text;

  console.log("[AI Service] Received response from Google AI.", text);

  return text;
}

export const generatMessagesAction = async () => {};

export const generateAiChatMessage = async (
  chatHistory: ChatHistory,
  aiUserId: string,
): Promise<Message | undefined> => {
  console.log("[AI Action] Generating AI Chat Message...");

  const historySlice = chatHistory.slice(-5);
  const prompt =
    historySlice
      .map((msg) => `${msg.userId === aiUserId ? "AI" : "User"}: ${msg.text}`)
      .join("\n") + "\nAI:";

  try {
    const aiResponseText = await callAIForStory(prompt);

    if (aiResponseText && aiResponseText.trim()) {
      const aiMessage: Message = {
        id: uuidv4(),
        userId: aiUserId,
        text: aiResponseText.trim(),
        timestamp: Date.now(),
      };
      console.log("[AI Action] Generated AI Message:", aiMessage);

      const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
      if (!appUrl) {
        console.error(
          "[AI Action] ERROR: NEXT_PUBLIC_APP_URL is not defined. Cannot post AI message to event stream.",
        );
      } else {
        fetch(`${appUrl}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...aiMessage, type: "chatMessage" }),
        }).catch((fetchError) => {
          console.error("[AI Action] Fetch to /api/events failed:", fetchError);
        });
      }

      return aiMessage;
    }
    console.log("[AI Action] AI did not return a response.");
    return undefined;
  } catch (error) {
    console.error("[AI Action] Error generating AI message:", error);
    return undefined;
  }
};
