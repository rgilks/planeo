"use client";

import { useSimulationStore } from "@/stores/simulationStore";

export const StartOverlay = () => {
  const setIsStarted = useSimulationStore((state) => state.setIsStarted);

  const handleClick = () => {
    setIsStarted(true);
  };

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        color: "white",
        fontSize: "2em",
        cursor: "pointer",
        zIndex: 1000,
      }}
      onClick={handleClick}
    >
      Click to Start
    </div>
  );
};
