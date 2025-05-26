"use server";

import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import { z } from "zod";

import { initializeTTSClient } from "./ttsClient";

const chirp3Voices = [
  "en-GB-Chirp3-HD-Aoede",
  "en-GB-Chirp3-HD-Charon",
  "en-GB-Chirp3-HD-Fenrir",
  "en-GB-Chirp3-HD-Kore",
  "en-GB-Chirp3-HD-Leda",
  "en-GB-Chirp3-HD-Orus",
  "en-GB-Chirp3-HD-Puck",
  "en-GB-Chirp3-HD-Zephyr",
  "en-IN-Chirp3-HD-Aoede",
  "en-IN-Chirp3-HD-Charon",
  "en-IN-Chirp3-HD-Fenrir",
  "en-IN-Chirp3-HD-Kore",
  "en-IN-Chirp3-HD-Leda",
  "en-IN-Chirp3-HD-Orus",
  "en-IN-Chirp3-HD-Puck",
  "en-IN-Chirp3-HD-Zephyr",
  "en-US-Chirp3-HD-Aoede",
  "en-US-Chirp3-HD-Charon",
  "en-US-Chirp3-HD-Fenrir",
  "en-US-Chirp3-HD-Kore",
  "en-US-Chirp3-HD-Leda",
  "en-US-Chirp3-HD-Orus",
  "en-US-Chirp3-HD-Puck",
  "en-US-Chirp3-HD-Zephyr",
];

const SynthesizeSpeechParamsSchema = z.object({
  text: z.string().min(1, "Text cannot be empty."),
  userId: z.string().min(1, "User ID cannot be empty."),
  voiceName: z.string().optional(),
});

type SynthesizeSpeechParams = z.infer<typeof SynthesizeSpeechParamsSchema>;

export interface SynthesizeSpeechResult {
  audioBase64?: string;
  error?: string;
  rateLimitError?: {
    message: string;
    resetTimestamp: number;
  };
}

const getVoiceForUser = (userId: string): string => {
  // Simple hash function to get a somewhat consistent number from a string
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  const voiceIndex = Math.abs(hash) % chirp3Voices.length;
  return chirp3Voices[voiceIndex];
};

async function performSynthesis(
  ttsClient: TextToSpeechClient,
  text: string,
  voiceName: string, // voiceName will always be determined before this call
  languageCode: string,
): Promise<{ audioBase64?: string; error?: string }> {
  try {
    const request = {
      input: { text: text },
      voice: {
        name: voiceName,
        languageCode: languageCode,
      },
      audioConfig: {
        audioEncoding: "MP3" as const,
      },
    };

    const [response] = await ttsClient.synthesizeSpeech(request);

    if (!response.audioContent) {
      console.error("[TTS Core] No audio content received from Google.");
      return { error: "TTS synthesis failed: No audio content." };
    }

    const audioBase64 = Buffer.from(
      response.audioContent as Uint8Array,
    ).toString("base64");
    return { audioBase64: audioBase64 };
  } catch (error) {
    console.error("[TTS Core] Google Cloud TTS Error:", error);
    return {
      error: error instanceof Error ? error.message : "TTS synthesis failed.",
    };
  }
}

export const synthesizeSpeechAction = async (
  params: SynthesizeSpeechParams,
): Promise<SynthesizeSpeechResult> => {
  const ttsEnabled = process.env["NEXT_PUBLIC_TTS_ENABLED"] !== "false";
  if (!ttsEnabled) {
    return { audioBase64: "", error: "TTS is disabled." }; // Return empty audio or a specific indicator
  }

  const validationResult = SynthesizeSpeechParamsSchema.safeParse(params);

  if (!validationResult.success) {
    console.error(
      "[TTS Action] Invalid parameters:",
      validationResult.error.flatten(),
    );
    return {
      error: `Invalid parameters: ${validationResult.error.flatten().fieldErrors}`,
    };
  }

  const { text, userId, voiceName: preferredVoiceName } = validationResult.data;

  // const session = await getSession();
  // if (!session?.user) {
  //   console.warn('[TTS Action] Unauthorized attempt.');
  //   return { error: 'Unauthorized: User must be logged in.' };
  // }

  // const ttsLimitCheck = await checkTTSRateLimit();
  // if (!ttsLimitCheck.success) {
  //   console.warn(`[TTS Action] Rate limit exceeded for user. Error: ${ttsLimitCheck.errorMessage}`);
  //   return {
  //     rateLimitError: {
  //       message: ttsLimitCheck.errorMessage ?? 'TTS rate limit exceeded.',
  //       resetTimestamp: ttsLimitCheck.reset,
  //     },
  //   };
  // }

  try {
    const ttsClient = initializeTTSClient();
    const voiceName = preferredVoiceName || getVoiceForUser(userId);
    const languageCode = voiceName.split("-").slice(0, 2).join("-"); // Derive language code from voice name

    const synthesisResult = await performSynthesis(
      ttsClient,
      text,
      voiceName,
      languageCode,
    );
    return synthesisResult;
  } catch (error) {
    console.error(
      "[TTS Action] Unexpected error during synthesis process:",
      error,
    );
    return {
      error:
        error instanceof Error
          ? error.message
          : "TTS synthesis failed due to an unexpected error.",
    };
  }
};
