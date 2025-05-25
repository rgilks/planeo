"use server";

import {
  GoogleGenAI,
  HarmCategory,
  HarmBlockThreshold,
  GenerationConfig,
} from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { AIResponseSchema, type ParsedAIResponse } from "@/domain/aiAction";
import { isAIAgentId, getAIAgentById } from "@/domain/aiAgent";
import { Message, MessageSchema } from "@/domain/message";
// Import only what is used in this file

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
  console.log("[AI Service] Calling AI for text-based story/chat...");
  console.log(
    `[AI Service] Prompt (first 200 chars): ${prompt.substring(0, 200)}${prompt.length > 200 ? "..." : ""}`,
  );

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
  console.log(`[AI Service] Using model: ${request.model}`);

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
  console.log(`[AI Action] Generating AI Chat Message for ${aiUserId}...`);

  const historySlice = chatHistory.slice(-5);
  const prompt =
    historySlice
      .map((msg) => {
        if (isAIAgentId(msg.userId)) {
          const agent = getAIAgentById(msg.userId);
          return `${msg.userId === aiUserId ? "You (AI)" : agent?.displayName || "AI"}: ${msg.text}`;
        }
        return `User: ${msg.text}`;
      })
      .join("\n") + `\n${getAIAgentById(aiUserId)?.displayName || "AI"}:`;

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
    console.error(
      "[AI Action] Error generating AI message:",
      error instanceof Error ? error.stack : error,
    );
    return undefined;
  }
};

// This function replaces the old generateAiVisionResponse
export const generateAiActionAndChat = async (
  aiAgentId: string,
  imageDataUrl: string,
  chatHistory: ChatHistory,
): Promise<ParsedAIResponse | undefined> => {
  console.log(`[AI Action & Chat] Generating for agent ${aiAgentId}...`);

  const genAI: GoogleGenAI = await getGoogleAIClient();
  const visionModelConfig = await getActiveVisionModel();
  const agent = getAIAgentById(aiAgentId);
  const agentDisplayName = agent?.displayName || aiAgentId;

  const base64ImageData = imageDataUrl.split(",")[1];
  if (!base64ImageData) {
    console.error("[AI Action & Chat] Invalid image data URL format.");
    return undefined;
  }

  const historySlice = chatHistory.slice(-10); // Slightly longer history for context

  // System prompt instructing the AI about its environment, capabilities, and desired JSON output
  const systemPrompt = `You are ${agentDisplayName}, an AI agent in a 3D grid world. You can see the world from your perspective.
You can communicate by providing a 'chat' message.
You can move by providing an 'action'. Possible actions are:
- Move: { "type": "move", "direction": "forward" | "backward", "distance": number_of_grid_squares }
- Turn: { "type": "turn", "direction": "left" | "right", "degrees": number_of_degrees }
- No action: { "type": "none" } or null

Based on the image you see and the recent chat history, decide on your next chat message (optional) and your next action.
Your entire response MUST be a single JSON object matching this structure:
{
  "chat": "your message here, or omit if no message",
  "action": { "type": "move", "direction": "forward", "distance": 1 }
}
Example if turning:
{
  "chat": "Turning left.",
  "action": { "type": "turn", "direction": "left", "degrees": 30 }
}
Example if no action:
{
  "chat": "I'll stay put.",
  "action": { "type": "none" }
}
If you don't want to say anything, you can omit the "chat" field or set it to an empty string.
Focus on very short, simple actions and observations. Do not get stuck. Try to explore.
The grid squares are roughly your body size. Distances are in grid squares. Degrees are for turning.
Current chat history (last 10 messages):`;

  const textPromptParts: string[] = [systemPrompt];
  historySlice.forEach((msg) => {
    if (isAIAgentId(msg.userId)) {
      const otherAgent = getAIAgentById(msg.userId);
      textPromptParts.push(
        `${msg.userId === aiAgentId ? "You (" + agentDisplayName + ")" : otherAgent?.displayName || "Other AI"}: ${msg.text}`,
      );
    } else {
      textPromptParts.push(`User: ${msg.text}`);
    }
  });
  const fullTextPrompt =
    textPromptParts.join("\n") +
    "\nWhat is your JSON response (chat and action)?";

  console.log(
    `[AI Action & Chat Service] Text prompt for ${agentDisplayName} (first 300 chars): ${fullTextPrompt.substring(
      0,
      300,
    )}${fullTextPrompt.length > 300 ? "..." : ""}`,
  );

  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/png", data: base64ImageData } },
        { text: fullTextPrompt },
      ],
    },
  ];

  // Ensure the model is configured to output JSON
  const generationConfig: GenerationConfig = {
    temperature: 0.7,
    topP: 0.9,
    topK: 30,
    candidateCount: 1,
    maxOutputTokens: 150, // Increased slightly to accommodate JSON
    responseMimeType: "application/json", // Request JSON output
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
    model: visionModelConfig.name, // Ensure this model supports JSON output well
    contents,
    generationConfig,
    safetySettings,
  };

  try {
    console.log(
      `[AI Action & Chat Service] Calling Vision AI model for ${agentDisplayName} expecting JSON...`,
    );
    const result = await genAI.models.generateContent(request);
    const aiResponseText = result.text;

    if (aiResponseText) {
      console.log(
        `[AI Action & Chat Service] Raw response for ${agentDisplayName}:`,
        aiResponseText,
      );

      // More robust pre-processing to remove markdown code block fences
      let jsonToParse = aiResponseText.trim();

      if (jsonToParse.startsWith("```json") && jsonToParse.endsWith("```")) {
        jsonToParse = jsonToParse.substring(7, jsonToParse.length - 3).trim();
        console.log(
          `[AI Action & Chat Service] Extracted JSON from markdown (\\\`\\\`\\\`json) for ${agentDisplayName}:`,
          jsonToParse,
        );
      } else if (jsonToParse.startsWith("```") && jsonToParse.endsWith("```")) {
        // Fallback for cases where 'json' language specifier might be missing or different
        jsonToParse = jsonToParse.substring(3, jsonToParse.length - 3).trim();
        console.log(
          `[AI Action & Chat Service] Extracted JSON from markdown (\\\`\\\`\\\`) for ${agentDisplayName}:`,
          jsonToParse,
        );
      }
      // If no fences were detected, jsonToParse remains the trimmed original aiResponseText

      try {
        const parsedJson = JSON.parse(jsonToParse); // Use the processed string
        const validatedResponse = AIResponseSchema.safeParse(parsedJson);

        if (validatedResponse.success) {
          console.log(
            `[AI Action & Chat Service] Successfully parsed and validated AI response for ${agentDisplayName}:`,
            validatedResponse.data,
          );
          return validatedResponse.data;
        } else {
          console.error(
            `[AI Action & Chat Service] Failed to validate AI JSON response for ${agentDisplayName}:`,
            validatedResponse.error.flatten(),
          );
          // Attempt to provide a default "no action" if parsing fails badly
          return { chat: "I'm a bit confused.", action: { type: "none" } };
        }
      } catch (jsonParseError) {
        console.error(
          `[AI Action & Chat Service] Error parsing JSON response for ${agentDisplayName}:`,
          jsonParseError,
          "Raw response was:", // Log the string that failed to parse
          aiResponseText, // This is the original raw response
          "Attempted to parse:", // This is what was actually passed to JSON.parse
          jsonToParse,
        );
        return {
          chat: "I had trouble thinking in JSON.",
          action: { type: "none" },
        };
      }
    }
    console.log(
      `[AI Action & Chat Service] AI (${agentDisplayName}) did not return a response text.`,
    );
    return { chat: "I'm speechless.", action: { type: "none" } };
  } catch (error) {
    console.error(
      `[AI Action & Chat Service] Error generating AI action/chat for ${agentDisplayName}:`,
      error instanceof Error ? error.stack : error,
    );
    // ... (keep existing error handling for GoogleAIError if needed) ...
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
    return { chat: "I encountered an error.", action: { type: "none" } };
  }
};
