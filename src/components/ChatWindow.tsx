"use client";

import { useState } from "react";
import { v4 as uuidv4 } from "uuid"; // For generating message IDs

import { useInputControlStore } from "@/stores/inputControlStore"; // Added import
import { useMessageStore } from "@/stores/messageStore";

import { ChatMessage } from "./ChatMessage";

import type { Message } from "@/domain/message"; // Moved import to top

interface ChatWindowProps {
  // Added interface for props
  myId: string;
}

export const ChatWindow = ({ myId }: ChatWindowProps) => {
  // Accept myId as prop
  const messages = useMessageStore((s) => s.messages);
  const addMessage = useMessageStore((s) => s.addMessage);
  const [inputText, setInputText] = useState("");
  const setChatInputFocused = useInputControlStore(
    (s) => s.setChatInputFocused,
  ); // Added

  // const currentUserId = "User1"; // Will use myId as userId for now

  const handleSendMessage = () => {
    if (inputText.trim()) {
      const message: Message = {
        id: uuidv4(),
        userId: myId, // Use myId from props
        text: inputText.trim(),
        timestamp: Date.now(),
      };
      // Add to local store immediately for responsiveness
      addMessage(message);
      setInputText("");

      // Send to server
      fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...message, type: "chatMessage" }), // Spread message and add type
      }).catch(console.error); // Basic error handling
    }
  };

  return (
    <div
      style={{
        border: "1px solid #444",
        backgroundColor: "#222228",
        padding: "10px",
        width: "300px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        color: "#e0e0e0",
      }}
    >
      <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "10px" }}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} currentUserId={myId} />
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
          onFocus={() => setChatInputFocused(true)}
          onBlur={() => setChatInputFocused(false)}
          style={{
            flexGrow: 1,
            marginRight: "5px",
            padding: "8px",
            border: "1px solid #555",
            borderRadius: "4px",
            backgroundColor: "#333338",
            color: "#e0e0e0",
          }}
        />
        <button
          onClick={handleSendMessage}
          style={{
            padding: "8px 15px",
            border: "none",
            borderRadius: "4px",
            backgroundColor: "#007bff",
            color: "white",
            cursor: "pointer",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
