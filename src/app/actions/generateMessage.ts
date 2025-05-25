"use server";

import fs from "fs";
import path from "path";

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
  const agent = getAIAgentById(aiUserId); // Get agent details
  const agentName = agent?.displayName || aiUserId; // Use displayName or fallback to ID

  const historySlice = chatHistory.slice(-5);
  const prompt =
    historySlice
      .map((msg) => {
        // Use msg.name if available, otherwise use logic to determine sender
        const senderName =
          msg.name ||
          (isAIAgentId(msg.userId)
            ? getAIAgentById(msg.userId)?.displayName || "AI"
            : "User");
        return `${senderName}: ${msg.text}`;
      })
      .join("\\n") + `\\n${agentName}:`; // Use agentName for the current AI

  try {
    const aiResponseText = await callAIForStory(prompt);

    if (aiResponseText && aiResponseText.trim()) {
      const aiMessage: Message = {
        id: uuidv4(),
        userId: aiUserId,
        name: agentName, // Add agentName to the message
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

  // --- BEGIN: Save debug image ---
  try {
    const debugImagesDir = path.join(process.cwd(), "debug_images");
    if (!fs.existsSync(debugImagesDir)) {
      fs.mkdirSync(debugImagesDir, { recursive: true });
      console.log(
        `[AI Action & Chat] Created debug_images directory: ${debugImagesDir}`,
      );
    }
    const imageName = `${aiAgentId}_${Date.now()}.png`;
    const imagePath = path.join(debugImagesDir, imageName);
    const imageBuffer = Buffer.from(base64ImageData, "base64");
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(
      `[AI Action & Chat] Saved debug image for ${aiAgentId} to ${imagePath}`,
    );
  } catch (error) {
    console.error(
      `[AI Action & Chat] Failed to save debug image for ${aiAgentId}:`,
      error,
    );
  }
  // --- END: Save debug image ---

  const historySlice = chatHistory.slice(-10); // Slightly longer history for context

  // System prompt instructing the AI about its environment, capabilities, and desired JSON output
  const systemPrompt = `You are ${agentDisplayName}. You have suddenly materialized in this place.
You have no memory of how you got here or who you are.
You feel a little disoriented and cautious, perhaps a bit afraid.

You are not alone. There may be other beings in this scene. Try to communicate with them.
You can see them as floating eyes. You can also try to look at them.

Communicate your thoughts, observations (based on what you see), and feelings in brief chat messages as you try to understand your surroundings.
What are you thinking? What are you feeling based on your current view?

You can also move and look. Possible actions are:
- Move: { "type": "move", "direction": "forward" | "backward", "distance": number_of_grid_squares }
- Turn: { "type": "turn", "direction": "left" | "right", "degrees": number_of_degrees }
- LookAt: { "type": "lookAt", "targetId": "ID_of_the_other_eye_to_look_at" } // New action
- No action: { "type": "none" } or null

Based on what you see, think, and feel, decide on your next chat message AND your next action.
Your entire response MUST be a single JSON object matching this structure:
\`\`\`json
{
  "chatMessage": "Your short chat message here. Example: 'Where am I?' or 'Is anyone there?'",
  "action": { "type": "move", "direction": "forward", "distance": 1 }
}
\`\`\`
If you want to look at another eye, the action would be: { "type": "lookAt", "targetId": "someEyeId" }
If you don't want to perform an action, use: { "type": "none" } or null for the action.

Previous chat history (last 10 messages):
${historySlice
  .map((msg) => {
    const senderName =
      msg.name ||
      (isAIAgentId(msg.userId)
        ? getAIAgentById(msg.userId)?.displayName || "AI"
        : "User");
    return `${senderName}: ${msg.text}`;
  })
  .join("\\n")}

Current view is provided as an image.
Your response:`;

  const contents = [
    {
      role: "user",
      parts: [
        { inlineData: { mimeType: "image/png", data: base64ImageData } },
        { text: systemPrompt },
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

          // If there's a chat message, send it to the event stream
          if (validatedResponse.data.chatMessage) {
            const aiChatMessage: Message = {
              id: uuidv4(),
              userId: aiAgentId,
              name: agentDisplayName, // Use the agent's display name
              text: validatedResponse.data.chatMessage,
              timestamp: Date.now(),
            };

            const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
            if (!appUrl) {
              console.error(
                "[AI Action & Chat Service] ERROR: NEXT_PUBLIC_APP_URL is not defined. Cannot post AI message to event stream.",
              );
            } else {
              fetch(`${appUrl}/api/events`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...aiChatMessage,
                  type: "chatMessage" as const,
                }),
              }).catch((fetchError) => {
                console.error(
                  "[AI Action & Chat Service] Fetch to /api/events for chat message failed:",
                  fetchError,
                );
              });
            }
          }

          return validatedResponse.data;
        } else {
          console.error(
            `[AI Action & Chat Service] Failed to validate AI JSON response for ${agentDisplayName}:`,
            validatedResponse.error.flatten(),
          );
          // Attempt to provide a default "no action" if parsing fails badly
          // Also send a fallback chat message if validation fails but we have a chat string
          let fallbackChatMessage = "I'm a bit confused.";
          if (
            typeof parsedJson?.chatMessage === "string" &&
            parsedJson.chatMessage.trim() !== ""
          ) {
            fallbackChatMessage = parsedJson.chatMessage.trim();
          }
          const fallbackMessage: Message = {
            id: uuidv4(),
            userId: aiAgentId,
            name: agentDisplayName,
            text: fallbackChatMessage,
            timestamp: Date.now(),
          };
          const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
          if (appUrl) {
            fetch(`${appUrl}/api/events`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...fallbackMessage,
                type: "chatMessage" as const,
              }),
            }).catch(console.error);
          }
          return { chatMessage: fallbackChatMessage, action: { type: "none" } };
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
        const errorMessage: Message = {
          id: uuidv4(),
          userId: aiAgentId,
          name: agentDisplayName,
          text: "I had trouble thinking in JSON.",
          timestamp: Date.now(),
        };
        const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
        if (appUrl) {
          fetch(`${appUrl}/api/events`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...errorMessage,
              type: "chatMessage" as const,
            }),
          }).catch(console.error);
        }
        return {
          chatMessage: "I had trouble thinking in JSON.",
          action: { type: "none" },
        };
      }
    }
    console.log(
      `[AI Action & Chat Service] AI (${agentDisplayName}) did not return a response text.`,
    );
    const speechlessMessage: Message = {
      id: uuidv4(),
      userId: aiAgentId,
      name: agentDisplayName,
      text: "I'm speechless.",
      timestamp: Date.now(),
    };
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
    if (appUrl) {
      fetch(`${appUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...speechlessMessage,
          type: "chatMessage" as const,
        }),
      }).catch(console.error);
    }
    return { chatMessage: "I'm speechless.", action: { type: "none" } };
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
    const errorMessage: Message = {
      id: uuidv4(),
      userId: aiAgentId,
      name: agentDisplayName,
      text: "I encountered an error while thinking.",
      timestamp: Date.now(),
    };
    const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
    if (appUrl) {
      fetch(`${appUrl}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...errorMessage, type: "chatMessage" as const }),
      }).catch(console.error);
    }
    return {
      chatMessage: "I encountered an error while thinking.",
      action: { type: "none" },
    };
  }
};
