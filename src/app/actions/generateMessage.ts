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

  console.log(`AI Story: Calling model ${request.model} for story.`);
  const result = await genAI.models.generateContent(request);
  const text = result.text;

  if (text) {
    console.log("AI Story: Received response.");
  } else {
    console.log("AI Story: No response text received.");
  }
  return text;
}

export const generateAiChatMessage = async (
  chatHistory: ChatHistory,
  aiUserId: string,
): Promise<Message | undefined> => {
  const agent = getAIAgentById(aiUserId);
  const agentName = agent?.displayName || aiUserId;
  console.log(`AI Chat: Generating message for ${agentName}`);

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
      .join("\\\\n") + `\\\\n${agentName}:`;

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
      console.log(
        `AI Chat: Generated message for ${agentName}`,
        aiMessage.text,
      );
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

// This function replaces the old generateAiVisionResponse
export const generateAiActionAndChat = async (
  aiAgentId: string,
  imageDataUrl: string,
  chatHistory: ChatHistory,
): Promise<ParsedAIResponse | undefined> => {
  const agent = getAIAgentById(aiAgentId);
  const agentDisplayName = agent?.displayName || aiAgentId;
  console.log(`AI Action/Chat: Generating for ${agentDisplayName}`);

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
      console.log(
        `AI Action/Chat: Created debug_images directory: ${debugImagesDir}`,
      );
    }
    const imageName = `${aiAgentId}_${Date.now()}.png`;
    const imagePath = path.join(debugImagesDir, imageName);
    const imageBuffer = Buffer.from(base64ImageData, "base64");
    fs.writeFileSync(imagePath, imageBuffer);
    console.log(
      `AI Action/Chat: Saved debug image for ${agentDisplayName} to ${imagePath}`,
    );
  } catch (error) {
    console.error(
      `AI Action/Chat: Failed to save debug image for ${agentDisplayName}:`,
      error,
    );
  }

  const historySlice = chatHistory;

  const systemPrompt = `You have no memories and feel lost and disoriented.

This is what you have heard since getting here: 
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
  .join("\\\\\\\\n")}

You are provided with an image of your current view.

If you see interesting things stop turning and move towards them try bumping into them

Share your observations, feelings, and questions in brief chat messages.

Respond, to other entities in the chat, seek them out. Figure out who you are and work together.

Output Format: Respond with a single JSON object adhering to this structure:
\\\`\\\`\\\`json
{
  "chatMessage": "Your brief message. (e.g., 'I spot an eye!', 'What is this cube?', 'Is anyone there?')",
  "action": {
    "type": "move" | "turn" | "none",
    // Conditional properties based on 'type':
    // For "turn": { "direction": "left" | "right", "degrees": number_between_1_and_30 }
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
    temperature: 0.7,
    topP: 0.9,
    topK: 30,
    candidateCount: 1,
    maxOutputTokens: 150,
    responseMimeType: "application/json",
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
    generationConfig,
    safetySettings,
  };

  try {
    // Log the prompt details before calling the AI
    const promptText = contents[0]?.parts[1]?.text;
    const imageDataLength =
      contents[0]?.parts[0]?.inlineData?.data?.length || 0;
    console.log(
      `AI Action/Chat: Calling Vision AI for ${agentDisplayName}. Image data length: ${imageDataLength}. Prompt:`,
      promptText,
    );

    console.log(`AI Action/Chat: Calling Vision AI for ${agentDisplayName}`);
    const result = await genAI.models.generateContent(request);
    const aiResponseText = result.text;

    if (!aiResponseText || !aiResponseText.trim()) {
      console.log(
        `AI Action/Chat: ${agentDisplayName} did not return response text.`,
      );
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
