"use client";

import { useThree, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useCallback } from "react";
import {
  PerspectiveCamera,
  WebGLRenderTarget,
  Vector3,
  LinearSRGBColorSpace,
} from "three";

import { requestAiDecision } from "@/app/actions/aiControllerActions";
import { getAIAgents } from "@/domain/aiAgent";
import { EYE_Y_POSITION } from "@/domain/sceneConstants";
import { roundArray } from "@/lib/utils";
import { useAIVisionStore } from "@/stores/aiVisionStore";
import { useEyesStore } from "@/stores/eyesStore";
import { useMessageStore } from "@/stores/messageStore";

import type { EyeUpdateType, Vec3 as DomainVec3 } from "@/domain";
import type { AIAction } from "@/domain/aiAction";


const RENDER_INTERVAL_MS = 7000; // How often each AI thinks
const CAPTURE_WIDTH = 320;
const CAPTURE_HEIGHT = 200;

export const useAIAgentController = (myId: string) => {
  const { gl, scene: mainScene } = useThree(); // Get main scene and renderer
  const agents = getAIAgents();
  const getMessages = useMessageStore((s) => s.messages);
  const managedEyes = useEyesStore((s) => s.managedEyes);
  const setAIAgentView = useAIVisionStore((s) => s.setAIAgentView);

  // Store for AI cameras and render targets
  const aiCameraRefs = useRef<Record<string, PerspectiveCamera>>({});
  const aiRenderTargetRefs = useRef<Record<string, WebGLRenderTarget>>({});

  // Keep track of last time an AI processed
  const lastProcessTime = useRef<Record<string, number>>({});
  const processingLock = useRef<Set<string>>(new Set()); // To prevent concurrent processing for the same AI

  // Initialize cameras and render targets for each AI
  useEffect(() => {
    agents.forEach((agent) => {
      if (!aiCameraRefs.current[agent.id]) {
        const cam = new PerspectiveCamera(
          75,
          CAPTURE_WIDTH / CAPTURE_HEIGHT,
          0.1,
          1000,
        );
        cam.position.y = EYE_Y_POSITION;
        aiCameraRefs.current[agent.id] = cam;
      }
      if (!aiRenderTargetRefs.current[agent.id]) {
        const target = new WebGLRenderTarget(CAPTURE_WIDTH, CAPTURE_HEIGHT);
        // Ensure correct color space if main renderer uses sRGB
        target.texture.colorSpace = gl.outputColorSpace;
        aiRenderTargetRefs.current[agent.id] = target;
      }
      if (!lastProcessTime.current[agent.id]) {
        // Stagger initial processing
        lastProcessTime.current[agent.id] =
          Date.now() + Math.random() * RENDER_INTERVAL_MS;
      }
    });

    return () => {
      // Cleanup render targets on unmount
      Object.values(aiRenderTargetRefs.current).forEach((target) =>
        target.dispose(),
      );
      aiRenderTargetRefs.current = {};
      aiCameraRefs.current = {};
    };
  }, [agents, gl]);

  const renderAndProcessAI = useCallback(
    async (agentId: string) => {
      if (processingLock.current.has(agentId)) return;
      processingLock.current.add(agentId);

      try {
        const agentState = managedEyes[agentId];
        const aiCamera = aiCameraRefs.current[agentId];
        const aiRenderTarget = aiRenderTargetRefs.current[agentId];

        if (!agentState || !aiCamera || !aiRenderTarget) {
          console.warn(
            `[AI Controller] Missing state/camera/target for ${agentId}`,
          );
          processingLock.current.delete(agentId);
          return;
        }

        // 1. Render AI Perspective
        aiCamera.position.copy(agentState.position);
        aiCamera.lookAt(agentState.lookAt);

        const originalRenderTarget = gl.getRenderTarget();
        const originalOutputColorSpace = gl.outputColorSpace;

        gl.setRenderTarget(aiRenderTarget);
        gl.outputColorSpace = LinearSRGBColorSpace; // Render to target in linear for consistency
        gl.render(mainScene, aiCamera);

        // Create a temporary canvas to get the data URL
        const captureCanvas = document.createElement("canvas");
        captureCanvas.width = CAPTURE_WIDTH;
        captureCanvas.height = CAPTURE_HEIGHT;
        const context = captureCanvas.getContext("2d");

        if (context) {
          const imageData = new Uint8Array(CAPTURE_WIDTH * CAPTURE_HEIGHT * 4);
          gl.readRenderTargetPixels(
            aiRenderTarget,
            0,
            0,
            CAPTURE_WIDTH,
            CAPTURE_HEIGHT,
            imageData,
          );

          // Flip the image vertically because WebGL reads pixels from bottom-left
          const bytesPerRow = CAPTURE_WIDTH * 4;
          const halfHeight = CAPTURE_HEIGHT / 2;
          for (let y = 0; y < halfHeight; ++y) {
            const topOffset = y * bytesPerRow;
            const bottomOffset = (CAPTURE_HEIGHT - y - 1) * bytesPerRow;
            for (let i = 0; i < bytesPerRow; ++i) {
              const temp = imageData[topOffset + i];
              imageData[topOffset + i] = imageData[bottomOffset + i];
              imageData[bottomOffset + i] = temp;
            }
          }
          const imgData = new ImageData(
            new Uint8ClampedArray(imageData.buffer),
            CAPTURE_WIDTH,
            CAPTURE_HEIGHT,
          );
          context.putImageData(imgData, 0, 0);
        }
        const imageDataUrl = captureCanvas.toDataURL("image/png");

        // Store the image data URL in the Zustand store
        setAIAgentView(agentId, imageDataUrl);

        // Restore original renderer state
        gl.setRenderTarget(originalRenderTarget);
        gl.outputColorSpace = originalOutputColorSpace;

        // 2. Get Chat History (slice if necessary)
        const chatHistory = getMessages.slice(-10); // Corrected: getMessages is the array directly

        // 3. Call Server Action
        console.log(
          `[AI Controller] Requesting decision for ${agentId} with image data (length: ${imageDataUrl.length})`,
        );
        const movementAction: AIAction = await requestAiDecision(
          agentId,
          imageDataUrl,
          chatHistory,
        );

        // 4. Handle Movement
        if (movementAction && movementAction.type !== "none") {
          console.log(
            `[AI Controller] Executing movement for ${agentId}:`,
            movementAction,
          );
          const currentAIState = managedEyes[agentId];
          if (currentAIState) {
            const currentPosition = currentAIState.position.clone();
            const currentLookAt = currentAIState.lookAt.clone();
            let newPosition = currentPosition.clone();
            const newLookAt = currentLookAt.clone();

            const forwardVector = new Vector3();
            forwardVector
              .subVectors(currentLookAt, currentPosition)
              .normalize();

            if (movementAction.type === "move") {
              const distance = movementAction.distance;
              if (movementAction.direction === "forward") {
                newPosition.addScaledVector(forwardVector, distance);
              } else if (movementAction.direction === "backward") {
                newPosition.addScaledVector(forwardVector, -distance);
              }
              newPosition.y = EYE_Y_POSITION; // Ensure AI stays on the ground plane
              // For move, the lookAt direction relative to position doesn't change, so update it based on newPosition
              newLookAt.addVectors(newPosition, forwardVector);
            } else if (movementAction.type === "turn") {
              const angleRad = (movementAction.degrees * Math.PI) / 180;
              const axis = new Vector3(0, 1, 0); // Turn around Y-axis

              // To turn the lookAt point, we need to rotate the forwardVector around the currentPosition
              const directionToLookAt = new Vector3().subVectors(
                currentLookAt,
                currentPosition,
              );
              if (movementAction.direction === "left") {
                directionToLookAt.applyAxisAngle(axis, angleRad);
              } else if (movementAction.direction === "right") {
                directionToLookAt.applyAxisAngle(axis, -angleRad);
              }
              newLookAt.addVectors(currentPosition, directionToLookAt);
              // Position doesn't change on turn
              newPosition = currentPosition;
            } else if (movementAction.type === "lookAt") {
              const targetEye = managedEyes[movementAction.targetId];
              if (targetEye) {
                newLookAt.copy(targetEye.position);
              } else {
                console.warn(
                  `[AI Controller] Target eye ${movementAction.targetId} not found for lookAt action.`,
                );
              }
              // Position doesn't change on lookAt
              newPosition = currentPosition;
            }

            // Send eye update
            const eyeUpdatePayload: EyeUpdateType = {
              type: "eyeUpdate",
              id: agentId,
              p: roundArray([
                newPosition.x,
                newPosition.y,
                newPosition.z,
              ]) as DomainVec3,
              l: roundArray([
                newLookAt.x,
                newLookAt.y,
                newLookAt.z,
              ]) as DomainVec3,
              t: Date.now(),
            };

            if (navigator.sendBeacon) {
              navigator.sendBeacon(
                "/api/events",
                JSON.stringify(eyeUpdatePayload),
              );
              console.log(
                `[AI Controller] Sent eyeUpdate for ${agentId} after movement.`,
              );
            } else {
              // Fallback for browsers that don't support sendBeacon (less common for modern ones)
              fetch("/api/events", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(eyeUpdatePayload),
                keepalive: true,
              }).catch((err) =>
                console.error(
                  "[AI Controller] Fallback eyeUpdate fetch failed:",
                  err,
                ),
              );
            }
          }
        }
      } catch (error) {
        console.error(
          `[AI Controller] Error processing agent ${agentId}:`,
          error,
        );
      } finally {
        lastProcessTime.current[agentId] = Date.now();
        processingLock.current.delete(agentId);
      }
    },
    [gl, mainScene, managedEyes, getMessages, setAIAgentView],
  );

  useFrame(() => {
    if (agents.length === 0) return;

    const now = Date.now();
    for (const agent of agents) {
      // Ensure this agent is not the user
      if (agent.id === myId) continue;

      if (now - (lastProcessTime.current[agent.id] || 0) > RENDER_INTERVAL_MS) {
        if (!processingLock.current.has(agent.id)) {
          renderAndProcessAI(agent.id);
          // Update lastProcessTime inside renderAndProcessAI's finally block to ensure it's set after completion/error
        }
      }
    }
  });

  // No return value needed, this hook manages AI agents autonomously
};
