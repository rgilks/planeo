"use client";

// import { useInputControlStore } from "@/stores/inputControlStore";
import { useChatStore } from "@/stores/chatStore";
import { useMessageStore } from "@/stores/messageStore";

import { ChatMessage } from "./ChatMessage";

interface ChatWindowProps {
  myId: string;
}

export const ChatWindow = ({ myId }: ChatWindowProps) => {
  const messages = useMessageStore((s) => s.messages);
  const isChatVisible = useChatStore((state) => state.isChatVisible);

  if (!isChatVisible) {
    return null;
  }

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
      <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "0px" }}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} currentUserId={myId} />
        ))}
      </div>
    </div>
  );
};
