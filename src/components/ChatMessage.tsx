"use client";

import { useEffect, useState, useRef } from "react";

import { synthesizeSpeechAction } from "@/app/actions/tts";

import type { Message } from "@/domain/message";

interface ChatMessageProps {
  message: Message;
  currentUserId: string;
}

export const ChatMessage = ({ message, currentUserId }: ChatMessageProps) => {
  const [audioStatus, setAudioStatus] = useState<
    "idle" | "loading" | "playing" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const isMyMessage = message.userId === currentUserId;

  useEffect(() => {
    if (isMyMessage || message.text.startsWith("/")) {
      // Don't speak own messages or commands
      return;
    }

    let isMounted = true;

    const playAudio = async () => {
      if (!isMounted) return;
      setAudioStatus("loading");
      setError(null);

      try {
        const result = await synthesizeSpeechAction({
          text: message.text,
          userId: message.userId,
        });

        if (!isMounted) return;

        if (result.error) {
          console.error("[ChatMessage TTS] Error from action:", result.error);
          setError(result.error);
          setAudioStatus("error");
        } else if (result.rateLimitError) {
          console.warn(
            "[ChatMessage TTS] Rate limit error:",
            result.rateLimitError.message,
          );
          setError(result.rateLimitError.message);
          setAudioStatus("error"); // Or a specific 'rate-limited' status
        } else if (result.audioBase64) {
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = ""; // Release old audio object
          }
          const newAudio = new Audio(
            "data:audio/mp3;base64," + result.audioBase64,
          );
          audioRef.current = newAudio;

          newAudio.onplaying = () => {
            if (isMounted) setAudioStatus("playing");
          };
          newAudio.onended = () => {
            if (isMounted) setAudioStatus("idle");
            if (audioRef.current) {
              audioRef.current.src = ""; // Release audio object after playing
              audioRef.current = null;
            }
          };
          newAudio.onerror = (e) => {
            if (isMounted) {
              console.error("[ChatMessage TTS] Audio playback error:", e);
              setError("Failed to play audio.");
              setAudioStatus("error");
            }
          };
          await newAudio.play().catch((e) => {
            if (isMounted) {
              console.error("[ChatMessage TTS] Audio play() rejected:", e);
              setError("Audio playback was prevented.");
              setAudioStatus("error");
            }
          });
        } else {
          if (isMounted) {
            setError("No audio data received.");
            setAudioStatus("error");
          }
        }
      } catch (e) {
        if (isMounted) {
          console.error("[ChatMessage TTS] Failed to synthesize speech:", e);
          setError(e instanceof Error ? e.message : "Unknown TTS error.");
          setAudioStatus("error");
        }
      }
    };

    // Play audio when the message changes and it's not from the current user
    // This assumes `message` object identity changes for new messages.
    // If messages can be updated in place, this logic might need adjustment.
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
        audioRef.current.src = ""; // Attempt to release resources
        audioRef.current = null;
      }
    };
  }, [message.id, message.text, message.userId, isMyMessage, currentUserId]);

  // Simple visual feedback for TTS status (optional)
  const getStatusIndicator = () => {
    if (isMyMessage) return null;
    switch (audioStatus) {
      case "loading":
        return (
          <span style={{ fontSize: "0.8em", marginLeft: "5px" }}>🎤...</span>
        );
      case "playing":
        return (
          <span style={{ fontSize: "0.8em", marginLeft: "5px" }}>🎤▶️</span>
        );
      case "error":
        return (
          <span style={{ fontSize: "0.8em", marginLeft: "5px", color: "red" }}>
            🎤❌
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ marginBottom: "5px", color: "#e0e0e0" }}>
      <span style={{ fontWeight: "bold", color: "#88c0f0" }}>
        {message.userId}:{" "}
      </span>
      <span>{message.text}</span>
      {getStatusIndicator()}
      {error && audioStatus === "error" && (
        <div style={{ fontSize: "0.7em", color: "red", marginTop: "2px" }}>
          TTS Error: {error}
        </div>
      )}
    </div>
  );
};
