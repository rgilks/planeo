"use client";

import Image from "next/image";
import React from "react";

import { getAIAgents } from "@/domain/aiAgent"; // To get display names or other info
import { useAIVisionStore } from "@/stores/aiVisionStore";

const MAX_AI_VIEWS = 2; // Display for the first two AIs

export const AIAgentViews = () => {
  const aiAgentViews = useAIVisionStore((state) => state.aiAgentViews);
  const agents = getAIAgents().slice(0, MAX_AI_VIEWS); // Get first two agents

  if (agents.length === 0) {
    return null;
  }

  // Styles adapted from AIVisionDisplay
  const styles: Record<string, React.CSSProperties> = {
    container: {
      position: "fixed",
      top: "10px",
      left: "10px",
      right: "10px",
      display: "flex",
      // justifyContent: "space-between", // We'll handle positioning individually
      zIndex: 1000, // Ensure it's on top
      pointerEvents: "none", // Allow clicks to pass through
    },
    viewWrapper: {
      // Individual wrapper for positioning
      position: "fixed",
      top: "10px",
      width: "160px", // Half of CAPTURE_WIDTH
      height: "100px", // Half of CAPTURE_HEIGHT
      border: "1px solid lime", // Changed from white to lime
      backgroundColor: "rgba(0, 0, 0, 0.7)", // Slightly more opaque
      padding: "0px", // Changed from 2px to 0px
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start", // Changed from center to flex-start
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
    loadingText: {
      // For loading state
      color: "white",
      fontSize: "10px",
      textAlign: "center",
    },
  };

  return (
    <div style={styles["container"]}>
      {agents.map((agent, index) => {
        const imageDataUrl = aiAgentViews[agent.id];
        const displayName = agent.displayName || agent.id;

        // Determine position based on index
        const positionStyle: React.CSSProperties = {};
        if (index === 0) {
          positionStyle.left = "10px";
        } else if (index === 1) {
          positionStyle.right = "10px";
        } else {
          return null; // Should not happen with slice(0, MAX_AI_VIEWS)
        }

        return (
          <div
            key={agent.id}
            style={{ ...styles["viewWrapper"], ...positionStyle }}
          >
            <div style={styles["imageContainer"]}>
              {imageDataUrl ? (
                <Image
                  src={imageDataUrl}
                  alt={`View from ${displayName}`}
                  style={styles["image"]}
                  fill
                  priority // Add priority prop
                />
              ) : (
                <p style={styles["loadingText"]}>
                  {`${displayName} view loading...`}
                </p>
              )}
            </div>
            <p style={styles["text"]}>{displayName}</p>
          </div>
        );
      })}
    </div>
  );
};
