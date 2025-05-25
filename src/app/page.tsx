"use client";

import { nanoid } from "nanoid";
import { useRef } from "react";

// import { useEffect } from "react"; // No longer needed if SymbolHandler is gone

// import { useSymbolStore } from "@/stores/symbolStore"; // No longer needed
import { ChatWindow } from "@/components/ChatWindow";
import Scene from "@components/Scene";
// import SymbolDisplay from "@components/Symbol"; // Removed import

// const SymbolHandler = ({ children }: { children: React.ReactNode }) => { // Removed SymbolHandler
//   useEffect(() => {
//   }, []);
//   return <>{children}</>;
// };

const HomePage = () => {
  const myId = useRef(nanoid(6)).current;

  return (
    <>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <Scene myId={myId} />
        </div>
      </main>
      {/* <SymbolDisplay /> */}
      {/* Removed SymbolDisplay component */}
      <div
        style={{
          position: "fixed",
          right: "10px",
          top: "10px",
          height: "calc(100vh - 20px)",
          width: "300px",
          zIndex: 1001,
          borderRadius: "8px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
        }}
      >
        <ChatWindow myId={myId} />
      </div>
    </>
  );
};

export default HomePage;
