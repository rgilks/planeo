"use client";

import Image from "next/image";
import React from "react";

import { getAIAgents } from "@/domain/aiAgent";
import { useAIVisionStore } from "@/stores/aiVisionStore";

const MAX_AI_VIEWS = 2; // Display for the first two AIs

export const AIVisionDisplay = () => {
  const aiAgentViews = useAIVisionStore((s) => s.aiAgentViews);
  const agents = getAIAgents().slice(0, MAX_AI_VIEWS);

  if (agents.length === 0) {
    return null;
  }

  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: "fixed",
      top: "10px",
      left: "10px",
      right: "10px",
      display: "flex",
      justifyContent: "space-between", // This will push views to edges if two, or one to left if one.
      zIndex: 500, // Below chat window and toggle button but above scene
      pointerEvents: "none",
    },
    view: {
      width: "160px",
      height: "100px",
      border: "1px solid white",
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "2px",
      boxSizing: "border-box",
    },
    imageContainer: {
      width: "100%",
      height: "calc(100% - 15px)", // Space for name label
      position: "relative", // For Next/Image fill
    },
    image: {
      objectFit: "contain",
    },
    text: {
      color: "white",
      fontSize: "10px",
      textAlign: "center",
      marginTop: "2px",
      width: "100%",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
  };

  return (
    <div style={styles["container"]}>
      {agents.map((agent, index) => {
        const imageDataUrl = aiAgentViews[agent.id];
        // Determine position: first agent on left, second on right
        const positionStyle: React.CSSProperties = {};
        if (agents.length === 1 && index === 0) {
          // Single agent, keep left
        } else if (index === 0) {
          // First of two, ensure it stays left
        } else if (index === 1) {
          // Second of two, ensure it stays right
          // No specific style needed if justifyContent: space-between handles it for two items
        }

        return (
          <div key={agent.id} style={{ ...styles["view"], ...positionStyle }}>
            <div style={styles["imageContainer"]}>
              {imageDataUrl ? (
                <Image
                  src={imageDataUrl}
                  alt={`${agent.displayName}\'s view`}
                  style={styles["image"]}
                  fill
                  priority={index < MAX_AI_VIEWS} // Prioritize loading for visible images
                />
              ) : (
                <p style={styles["text"]}>
                  {`${agent.displayName}\'s view loading...`}
                </p>
              )}
            </div>
            <p style={styles["text"]}>{agent.displayName}</p>
          </div>
        );
      })}
    </div>
  );
};
