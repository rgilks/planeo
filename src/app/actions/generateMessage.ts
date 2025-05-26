"use server";

import fs from "fs";
import path from "path";

import { GoogleGenAI, GenerationConfig } from "@google/genai";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

import { AIResponseSchema, type ParsedAIResponse } from "@/domain/aiAction";
import { isAIAgentId, getAIAgentById } from "@/domain/aiAgent";
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

const postChatMessageToEvents = (message: Message): void => {
  const appUrl = process.env["NEXT_PUBLIC_APP_URL"];
  if (!appUrl) {
    console.error(
      "EventService: NEXT_PUBLIC_APP_URL is not defined. Cannot post message.",
    );
    return;
  }

  fetch(`${appUrl}/api/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...message, type: "chatMessage" as const }),
  }).catch((fetchError) => {
    console.error("EventService: Fetch to /api/events failed:", fetchError);
  });
};

export const getGoogleAIClient = async (): Promise<GoogleGenAI> => {
  if (genAIClient) {
    return genAIClient;
  }

  const apiKey = process.env["GOOGLE_AI_API_KEY"]!;

  try {
    genAIClient = new GoogleGenAI({ apiKey });
    return genAIClient;
  } catch (error) {
    console.error("GoogleAI: Failed to initialize client:", error);
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
  const genAI: GoogleGenAI = await getGoogleAIClient();

  const baseConfig: GenerationConfig = {
    temperature: 0.5,
    topP: 0.8,
    topK: 30,
    frequencyPenalty: 0.3,
    presencePenalty: 0.6,
    candidateCount: 1,
    maxOutputTokens: 150,
  };

  const generationConfig = { ...baseConfig, ...configOverrides };

  const request = {
    model: "gemini-2.0-flash-lite",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig,
    safetySettings: [],
  };

  console.log("AI Story Prompt:", JSON.stringify(request, null, 2));

  const result = await genAI.models.generateContent(request);
  const text = result.text;

  console.log("AI Story Response:", text);

  return text;
}

export const generateAiChatMessage = async (
  chatHistory: ChatHistory,
  aiUserId: string,
): Promise<Message | undefined> => {
  const agent = getAIAgentById(aiUserId);
  const agentName = agent?.displayName || aiUserId;

  const historySlice = chatHistory;
  const prompt =
    historySlice
      .map((msg) => {
        const senderName =
          msg.name ||
          (isAIAgentId(msg.userId)
            ? getAIAgentById(msg.userId)?.displayName || "AI"
            : "User");
        return `${senderName}: ${msg.text}`;
      })
      .join("\n") + `\n${agentName}:`;

  try {
    const aiResponseText = await callAIForStory(prompt);

    if (aiResponseText && aiResponseText.trim()) {
      const aiMessage: Message = {
        id: uuidv4(),
        userId: aiUserId,
        name: agentName,
        text: aiResponseText.trim(),
        timestamp: Date.now(),
      };
      postChatMessageToEvents(aiMessage);
      return aiMessage;
    }
    console.log(`AI Chat: ${agentName} did not return a response.`);
    return undefined;
  } catch (error) {
    console.error(
      `AI Chat: Error generating message for ${agentName}:`,
      error instanceof Error ? error.stack : error,
    );
    return undefined;
  }
};

// Define types for action history
export type AgentAction = ParsedAIResponse["action"];

// This function replaces the old generateAiVisionResponse
export const generateAiActionAndChat = async (
  aiAgentId: string,
  imageDataUrl: string,
  chatHistory: ChatHistory,
): Promise<ParsedAIResponse | undefined> => {
  const agent = getAIAgentById(aiAgentId);
  const agentDisplayName = agent?.displayName || aiAgentId;

  const genAI: GoogleGenAI = await getGoogleAIClient();
  const visionModelConfig = await getActiveVisionModel();

  const base64ImageData = imageDataUrl.split(",")[1];
  if (!base64ImageData) {
    console.error("AI Action/Chat: Invalid image data URL format.");
    return undefined;
  }

  try {
    const debugImagesDir = path.join(process.cwd(), "debug_images");
    if (!fs.existsSync(debugImagesDir)) {
      fs.mkdirSync(debugImagesDir, { recursive: true });
    }
    const imageName = `${aiAgentId}_${Date.now()}.png`;
    const imagePath = path.join(debugImagesDir, imageName);
    const imageBuffer = Buffer.from(base64ImageData, "base64");
    fs.writeFileSync(imagePath, imageBuffer);
  } catch (error) {
    console.error(
      `AI Action/Chat: Failed to save debug image for ${agentDisplayName}:`,
      error,
    );
  }

  const historySlice = chatHistory;

  /* // Removed unused function
  const formatActionForPrompt = (action: AgentAction): string => {
    if (!action) {
      return "- An unknown previous action."; 
    }
    switch (action.type) {
      case "none":
        return "- Previously, you chose to pause and observe.";
      case "move":
        return `- Previously, you moved ${action.direction} ${action.distance} grid square(s).`;
      case "turn":
        return `- Previously, you turned ${action.direction} ${action.degrees} degrees.`;
      default:
        return `- Previously, you performed an uncharacterised action: ${JSON.stringify(action)}`;
    }
  };
  */

  const systemPrompt = `You awaken with no prior memories of who you are or how you got here. You feel lost, disoriented, scared and freaking out. You are now trying to make sense of your surroundings and remember what you\'ve done recently. Imagine being someone in this situation and act and speak accordingly.

You are provided with an image of your current view.

This is what has been said by you and others:
Chat History (SenderName: MessageText):
${historySlice
  .map((msg) => {
    const senderName =
      msg.name ||
      (isAIAgentId(msg.userId)
        ? getAIAgentById(msg.userId)?.displayName || msg.userId
        : "User");
    return `${senderName}: ${msg.text}`;
  })
  .join("\n")}

You think you might be called ${agentDisplayName}

Actively explore your surroundings. Turning to scan the area is a good way to find new things or understand your location better. If you see something interesting, you can turn to get a better look or move towards it. Try to interact with objects and other beings you encounter.

Talk to other entities in the chat. Keep your chat messages BRIEF, like one sentence or a question. Share only essential observations, feelings, or questions. Discuss your situation with them and try to make plans together. Figure out who you are and work together. It\'s okay to perform an action without chatting, but prioritize communication when you have something to share or a question to ask. Aim to chat frequently but always keep it short and to the point to collaborate effectively.

Respond, to other entities in the chat, seek them out. Figure out who you are and work together. Don\'t keep repeating their names.

Output Format: Respond with a single JSON object adhering to this structure:
\\\`\\\`\\\`json
{
  "chatMessage": "Your brief message. (e.g., \'I spot an eye!\', \'What is this cube?\', \'Is anyone there?\', \'What should we do next?\')",
  "action": {
    "type": "move" | "turn" | "none",
    // Conditional properties based on 'type':
    // For "turn": { "direction": "left" | "right", "degrees": number_between_1_and_45 }
    // For "move": { "direction": "forward" | "backward", "distance": number_of_grid_squares }
    // For "none": {}
  }
}
\\\`\\\`\\\`

Action Examples:
- Scan: { "type": "turn", "direction": "right", "degrees": 30 }
- Approach eye/object: { "type": "move", "direction": "forward", "distance": 2 }

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

  const generationConfig: GenerationConfig = {
    temperature: 0.4,
    topP: 0.7,
    topK: 20,
    candidateCount: 1,
    maxOutputTokens: 150,
    responseMimeType: "application/json",
  };

  const request = {
    model: visionModelConfig.name,
    contents,
    generationConfig,
    safetySettings: [],
  };

  console.log(
    `AI Action/Chat Prompt for ${agentDisplayName}:`,
    JSON.stringify(
      {
        ...request,
        contents: [
          {
            ...request.contents[0],
            parts: [
              {
                inlineData: {
                  mimeType: "image/png",
                  data: "<image_data_omitted>",
                },
              },
              request.contents[0].parts[1],
            ],
          },
        ],
      },
      null,
      2,
    ),
  );

  try {
    const result = await genAI.models.generateContent(request);
    const aiResponseText = result.text;

    console.log(
      `AI Action/Chat Raw Response for ${agentDisplayName}:`,
      aiResponseText,
    );

    if (!aiResponseText || !aiResponseText.trim()) {
      return undefined;
    }

    let jsonToParse = aiResponseText.trim();
    if (jsonToParse.startsWith("```json") && jsonToParse.endsWith("```")) {
      jsonToParse = jsonToParse.substring(7, jsonToParse.length - 3).trim();
    } else if (jsonToParse.startsWith("```") && jsonToParse.endsWith("```")) {
      jsonToParse = jsonToParse.substring(3, jsonToParse.length - 3).trim();
    }

    let parsedJson;
    try {
      parsedJson = JSON.parse(jsonToParse);
    } catch (jsonParseError) {
      console.error(
        `AI Action/Chat: Error parsing JSON for ${agentDisplayName}:`,
        jsonParseError,
        "Raw response:",
        aiResponseText,
        "Attempted to parse:",
        jsonToParse,
      );
      return undefined;
    }

    const validatedResponse = AIResponseSchema.safeParse(parsedJson);

    if (validatedResponse.success) {
      console.log(
        `AI Action/Chat: Validated response for ${agentDisplayName}:`,
        validatedResponse.data,
      );

      if (validatedResponse.data.chatMessage) {
        const aiChatMessage: Message = {
          id: uuidv4(),
          userId: aiAgentId,
          name: agentDisplayName,
          text: validatedResponse.data.chatMessage,
          timestamp: Date.now(),
        };
        postChatMessageToEvents(aiChatMessage);
      }
      return validatedResponse.data;
    } else {
      console.error(
        `AI Action/Chat: Failed to validate AI JSON for ${agentDisplayName}:`,
        validatedResponse.error.flatten(),
        "Parsed JSON was:",
        parsedJson,
      );
      return undefined;
    }
  } catch (error) {
    console.error(
      `AI Action/Chat: Error generating for ${agentDisplayName}:`,
      error instanceof Error ? error.stack : error,
    );

    if (error instanceof Error) {
      const gError = error as GoogleAIError;
      if (
        gError.response?.candidates &&
        gError.response.candidates.length > 0 &&
        gError.response.candidates[0]?.safetyRatings
      ) {
        console.error(
          "AI Action/Chat: Safety feedback:",
          gError.response.candidates[0]?.safetyRatings,
        );
      }
    }
    return undefined;
  }
};
