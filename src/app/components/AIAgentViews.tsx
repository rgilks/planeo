"use client";

import Image from "next/image";
import React from "react";

import { getAIAgents } from "@/domain/aiAgent"; // To get display names or other info
import { useAIVisionStore } from "@/stores/aiVisionStore";

export const AIAgentViews = () => {
  const aiAgentViews = useAIVisionStore((state) => state.aiAgentViews);
  const agents = getAIAgents(); // Get all defined AI agents

  // We only want to display views for the configured AI agents
  const agentIdsToDisplay = agents.map((agent) => agent.id);

  const views = agentIdsToDisplay
    .map((agentId, index) => {
      const imageDataUrl = aiAgentViews[agentId];
      const agent = agents.find((a) => a.id === agentId);
      const displayName = agent?.displayName || agentId;

      if (!imageDataUrl) {
        return null; // Or a placeholder
      }

      // Determine position based on index (e.g., first agent top-left, second top-right)
      const positionStyle: React.CSSProperties =
        index === 0
          ? { top: "10px", left: "10px" }
          : index === 1
            ? { top: "10px", right: "10px" }
            : { display: "none" }; // Hide if more than 2 for now

      return (
        <div
          key={agentId}
          style={{
            position: "fixed",
            ...positionStyle,
            width: "160px", // Half of CAPTURE_WIDTH from useAIAgentController
            height: "100px", // Half of CAPTURE_HEIGHT
            border: "1px solid #ccc",
            zIndex: 1000, // Ensure it's on top
            backgroundColor: "black",
          }}
        >
          <Image
            src={imageDataUrl}
            alt={`View from ${displayName}`}
            width={160}
            height={100}
            style={{ objectFit: "contain" }}
          />
          <p
            style={{
              position: "absolute",
              bottom: "0px",
              left: "5px",
              color: "white",
              fontSize: "10px",
              backgroundColor: "rgba(0,0,0,0.5)",
              padding: "2px",
            }}
          >
            {displayName}
          </p>
        </div>
      );
    })
    .filter(Boolean); // Remove nulls

  return <>{views}</>;
};
