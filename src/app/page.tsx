"use client";

import { nanoid } from "nanoid";
import { useRef } from "react";

import { ChatToggleButton } from "@/app/components/ChatToggleButton";
import { ChatWindow } from "@/components/ChatWindow";
import { useAiChat, useEyesDataSynchronizer } from "@/hooks";
import { useCommunicationStore } from "@/stores/communicationStore";
import Scene from "@components/Scene";

const HomePage = () => {
  const myId = useRef(nanoid(6)).current;
  const isChatVisible = useCommunicationStore((state) => state.isChatVisible);

  useAiChat(myId);
  useEyesDataSynchronizer(myId);

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <Scene myId={myId} />
        </div>
      </main>
      <ChatToggleButton />
      <div
        style={{
          position: "fixed",
          right: "10px",
          top: "10px",
          height: "calc(100vh - 20px)",
          width: "300px",
          zIndex: 1000,
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
          display: isChatVisible ? "block" : "none",
        }}
      >
        <ChatWindow myId={myId} />
      </div>
    </>
  );
};

export default HomePage;
