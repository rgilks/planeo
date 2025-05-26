"use server";

import { GoogleGenAI, GenerationConfig } from "@google/genai";

// Singleton client instance
let genAIClient: GoogleGenAI | null = null;

/**
 * Interface for Google AI errors, attempting to capture potential safety feedback.
 */
interface GoogleAIError extends Error {
  response?: {
    candidates?: Array<{
      safetyRatings?: Array<Record<string, unknown>>;
    }>;
  };
}

/**
 * Initializes and returns a singleton GoogleGenAI client.
 * Uses the GOOGLE_AI_API_KEY environment variable.
 * @returns {Promise<GoogleGenAI>} The initialized GoogleGenAI client.
 * @throws Will throw an error if initialization fails.
 */
export const getGoogleAIClient = async (): Promise<GoogleGenAI> => {
  if (genAIClient) {
    return genAIClient;
  }

  const apiKey = process.env["GOOGLE_AI_API_KEY"];
  if (!apiKey) {
    console.error("GoogleAI: GOOGLE_AI_API_KEY is not set.");
    throw new Error("GoogleAI: GOOGLE_AI_API_KEY is not set.");
  }

  try {
    genAIClient = new GoogleGenAI({ apiKey });
    console.log("GoogleAI: Client initialized successfully.");
    return genAIClient;
  } catch (error) {
    console.error("GoogleAI: Failed to initialize client:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

/**
 * Retrieves the configuration for the active text generation model.
 * @returns {Promise<object>} Model configuration.
 */
export const getActiveTextModel = async () => {
  return {
    provider: "google",
    name: "gemini-2.0-flash-lite", // Updated from gemini-1.5-flash-latest to gemini-2.0-flash-lite
    displayName: "Gemini 2.0 Flash-Lite",
    maxTokens: 500, // Example value, adjust as needed
  };
};

/**
 * Retrieves the configuration for the active vision-capable model.
 * @returns {Promise<object>} Model configuration.
 */
export const getActiveVisionModel = async () => {
  return {
    provider: "google",
    name: "gemini-1.5-flash-latest", // Corrected to gemini-1.5-flash-latest
    displayName: "Gemini 1.5 Flash",
    maxTokens: 500, // Example value, adjust as needed
  };
};

/**
 * Type for overriding parts of the AI generation configuration.
 */
export type AIConfigOverrides = Partial<GenerationConfig>;

/**
 * Calls a Google AI model for text completion based on a prompt.
 * @param {string} prompt - The input prompt for the AI.
 * @param {AIConfigOverrides} [configOverrides] - Optional overrides for the generation config.
 * @returns {Promise<string | undefined>} The AI-generated text, or undefined if an error occurs or no text is generated.
 */
export const generateTextCompletion = async (
  prompt: string,
  configOverrides?: AIConfigOverrides,
): Promise<string | undefined> => {
  try {
    const genAI: GoogleGenAI = await getGoogleAIClient();
    const textModelConfig = await getActiveTextModel(); // Using the specific text model

    const baseConfig: GenerationConfig = {
      temperature: 0.5,
      topP: 0.8,
      topK: 30,
      frequencyPenalty: 0.3,
      presencePenalty: 0.6,
      candidateCount: 1,
      maxOutputTokens: 150, // Default for general text, can be overridden
    };

    const generationConfig = { ...baseConfig, ...configOverrides };

    const request = {
      model: textModelConfig.name, // Use the dynamically fetched model name
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings: [], // Consider making safety settings configurable
    };

    console.log("AI Text Completion Prompt:", JSON.stringify(request, null, 2));

    const result = await genAI.models.generateContent(request);
    const text = result.text;

    console.log("AI Text Completion Response:", text);

    if (!text || text.trim() === "") {
      console.warn("AI Text Completion: Received empty response from model.");
      return undefined;
    }

    return text;
  } catch (error) {
    console.error("AI Text Completion: Error during generation:", error);
    // Check for GoogleAIError specific details
    if (error instanceof Error) {
      const gError = error as GoogleAIError;
      if (
        gError.response?.candidates &&
        gError.response.candidates.length > 0 &&
        gError.response.candidates[0]?.safetyRatings
      ) {
        console.error(
          "AI Text Completion: Safety feedback:",
          gError.response.candidates[0]?.safetyRatings,
        );
      }
    }
    return undefined; // Return undefined on error to allow graceful handling
  }
};
