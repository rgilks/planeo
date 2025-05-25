"use client";

import type { Message } from "@/domain/message";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  return (
    <div style={{ marginBottom: "5px", color: "#e0e0e0" }}>
      <span style={{ fontWeight: "bold", color: "#88c0f0" }}>
        {message.userId}:{" "}
      </span>
      <span>{message.text}</span>
    </div>
  );
};
