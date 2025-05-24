"use client";

import { useEffect } from "react";

import { useSymbolStore } from "@/stores/symbolStore";
import Scene from "@components/Scene";
import SymbolDisplay from "@components/Symbol";

const SymbolHandler = ({ children }: { children: React.ReactNode }) => {
  const setLastInput = useSymbolStore((s) => s.setLastInput);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      setLastInput({ key: e.key });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setLastInput]);

  return <>{children}</>;
};

const HomePage = () => {
  return (
    <SymbolHandler>
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#111119]">
        <div className="w-full h-screen">
          <Scene />
        </div>
      </main>
      <SymbolDisplay />
    </SymbolHandler>
  );
};

export default HomePage;
