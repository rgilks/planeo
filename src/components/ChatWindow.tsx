"use client";

import { type ChatMessageEventType } from "@/domain/event";
import { useCommunicationStore } from "@/stores/communicationStore";
import { useEventStore } from "@/stores/eventStore";

import { ChatInput } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";

interface ChatWindowProps {
  myId: string;
}

export const ChatWindow = ({ myId }: ChatWindowProps) => {
  const messages = useCommunicationStore((s) => s.messages);
  const addMessage = useCommunicationStore((s) => s.addMessage);
  const { sendChatMessage } = useEventStore.getState();

  const handleSendMessage = (text: string) => {
    const newMessage: ChatMessageEventType = {
      id: crypto.randomUUID(),
      userId: myId,
      name: "User",
      text,
      timestamp: Date.now(),
      type: "chatMessage" as const,
    };

    addMessage(newMessage);

    sendChatMessage(newMessage);
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
      <div style={{ flexGrow: 1, overflowY: "auto", marginBottom: "0px" }}>
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} currentUserId={myId} />
        ))}
      </div>
      <ChatInput onSendMessage={handleSendMessage} />
    </div>
  );
};
