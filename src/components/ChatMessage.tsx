"use client";

import { useEffect, useRef } from "react";

import { synthesizeSpeechAction } from "@/app/actions/tts";

import type { Message } from "@/domain/message";

interface ChatMessageProps {
  message: Message;
  currentUserId: string;
}

export const ChatMessage = ({ message, currentUserId }: ChatMessageProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isMyMessage = message.userId === currentUserId;

  useEffect(() => {
    if (isMyMessage || message.text.startsWith("/")) {
      return;
    }

    let isMounted = true;

    const playAudio = async () => {
      if (!isMounted) return;

      try {
        const result = await synthesizeSpeechAction({
          text: message.text,
          userId: message.userId,
        });

        if (!isMounted) return;

        if (result.error) {
          console.error("[ChatMessage TTS] Error from action:", result.error);
        } else if (result.rateLimitError) {
          console.warn(
            "[ChatMessage TTS] Rate limit error:",
            result.rateLimitError.message,
          );
        } else if (result.audioBase64) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }
          const newAudio = new Audio(
            "data:audio/mp3;base64," + result.audioBase64,
          );
          audioRef.current = newAudio;

          newAudio.onplaying = () => {};

          newAudio.onended = () => {
            if (isMounted && audioRef.current) {
              audioRef.current.src = "";
              audioRef.current = null;
            }
          };

          newAudio.onerror = (e) => {
            if (isMounted) {
              console.error(
                "[ChatMessage TTS] Audio playback error event (onerror):",
                e,
                "Audio element error object:",
                audioRef.current?.error,
              );
            }
          };

          try {
            await newAudio.play();
          } catch (playError) {
            if (isMounted) {
              console.warn(
                "[ChatMessage TTS] Audio play() promise rejected (likely autoplay):",
                playError,
              );
            }
          }
        } else {
          if (isMounted) {
            console.warn("[ChatMessage TTS] No audio data received.");
          }
        }
      } catch (e) {
        if (isMounted) {
          console.error("[ChatMessage TTS] Failed to synthesize speech:", e);
        }
      }
    };

    if (message.id && !isMyMessage) {
      playAudio();
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onplaying = null;
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, [message.id, message.text, message.userId, isMyMessage, currentUserId]);

  return (
    <div style={{ marginBottom: "5px", color: "#e0e0e0" }}>
      <span style={{ fontWeight: "bold", color: "#88c0f0" }}>
        {message.userId}:{" "}
      </span>
      <span>{message.text}</span>
    </div>
  );
};
