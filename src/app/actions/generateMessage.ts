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

interface GoogleAIError extends Error {
  response?: {
    candidates?: Array<{
      safetyRatings?: Array<Record<string, unknown>>;
    }>;
  };
}

export type ChatHistory = z.infer<typeof MessageSchema>[];

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

export const getActiveVisionModel = async () => {
  return {
    provider: "google",
    name: "gemini-1.5-flash-latest",
    displayName: "Gemini 1.5 Flash",
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
          body: JSON.stringify({ ...aiMessage, type: "chatMessage" as const }),
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

export const generateAiVisionResponse = async (
  imageDataUrl: string,
  chatHistory: ChatHistory,
  aiUserId: string,
): Promise<Message | undefined> => {
  console.log("[AI Vision Action] Generating AI response from vision...");

  const genAI: GoogleGenAI = await getGoogleAIClient();
  const visionModelConfig = await getActiveVisionModel();

  const base64ImageData = imageDataUrl.split(",")[1];

  if (!base64ImageData) {
    console.error("[AI Vision Action] Invalid image data URL format.");
    return undefined;
  }

  const historySlice = chatHistory.slice(-5);
  const systemPrompt =
    "You are an AI entity looking through an eye. This is what you currently see. Based on this image and our previous conversation, what do you observe or what should be said? Be concise.";

  const textPromptParts: string[] = [systemPrompt];
  historySlice.forEach((msg) => {
    textPromptParts.push(
      `${msg.userId === aiUserId ? "You (AI)" : "User"}: ${msg.text}`,
    );
  });
  const fullTextPrompt = textPromptParts.join("\n");

  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/png", data: base64ImageData } },
        { text: fullTextPrompt },
      ],
    },
  ];

  const baseConfig: GenerationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 30,
    candidateCount: 1,
    maxOutputTokens: 100,
  };

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
    model: visionModelConfig.name,
    contents,
    generationConfig: baseConfig,
    safetySettings,
  };

  try {
    console.log("[AI Vision Service] Calling Vision AI model...");
    const result = await genAI.models.generateContent(request);
    const aiResponseText = result.text;

    if (aiResponseText && aiResponseText.trim()) {
      const aiMessage: Message = {
        id: uuidv4(),
        userId: aiUserId,
        text: aiResponseText.trim(),
        timestamp: Date.now(),
      };
      console.log(
        "[AI Vision Action] Generated AI Message from vision:",
        aiMessage,
      );

      const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
      if (!appUrl) {
        console.error(
          "[AI Vision Action] ERROR: NEXT_PUBLIC_APP_URL is not defined. Cannot post AI message to event stream.",
        );
      } else {
        fetch(`${appUrl}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...aiMessage, type: "chatMessage" as const }),
        }).catch((fetchError) => {
          console.error(
            "[AI Vision Action] Fetch to /api/events failed:",
            fetchError,
          );
        });
      }
      return aiMessage;
    }
    console.log("[AI Vision Action] AI (vision) did not return a response.");
    return undefined;
  } catch (error) {
    console.error(
      "[AI Vision Action] Error generating AI message from vision:",
      error,
    );
    if (error instanceof Error) {
      const gError = error as GoogleAIError;
      if (
        gError.response?.candidates &&
        gError.response.candidates.length > 0 &&
        gError.response.candidates[0]?.safetyRatings
      ) {
        console.error(
          "Safety feedback:",
          gError.response.candidates[0]?.safetyRatings,
        );
      } else if (gError.message) {
        console.error("Error message:", gError.message);
      }
    } else {
      console.error("Caught an unknown error type:", error);
    }
    return undefined;
  }
};
