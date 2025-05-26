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

const VISUAL_UPDATE_INTERVAL_MS = 100; // For smoother view updates (~10 FPS)
const DECISION_MAKING_INTERVAL_MS = 7000; // How often each AI thinks (LLM call)
const CAPTURE_WIDTH = 320;
const CAPTURE_HEIGHT = 200;

export const useAIAgentController = (myId: string) => {
  const { gl, scene: mainScene } = useThree();
  const agents = getAIAgents();
  const getMessages = useMessageStore((s) => s.messages);
  const managedEyes = useEyesStore((s) => s.managedEyes);
  const setAIAgentView = useAIVisionStore((s) => s.setAIAgentView);

  const aiCameraRefs = useRef<Record<string, PerspectiveCamera>>({});
  const aiRenderTargetRefs = useRef<Record<string, WebGLRenderTarget>>({});

  const lastVisualUpdateTime = useRef<Record<string, number>>({});
  const lastDecisionTime = useRef<Record<string, number>>({});
  const decisionProcessingLock = useRef<Set<string>>(new Set());

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
        target.texture.colorSpace = gl.outputColorSpace;
        aiRenderTargetRefs.current[agent.id] = target;
      }
      if (!lastVisualUpdateTime.current[agent.id]) {
        lastVisualUpdateTime.current[agent.id] =
          Date.now() + Math.random() * VISUAL_UPDATE_INTERVAL_MS;
      }
      if (!lastDecisionTime.current[agent.id]) {
        lastDecisionTime.current[agent.id] =
          Date.now() + Math.random() * DECISION_MAKING_INTERVAL_MS;
      }
    });

    return () => {
      Object.values(aiRenderTargetRefs.current).forEach((target) =>
        target.dispose(),
      );
      aiRenderTargetRefs.current = {};
      aiCameraRefs.current = {};
    };
  }, [agents, gl]);

  const extractImageDataFromRenderer = useCallback(
    (agentId: string): string | null => {
      const agentState = managedEyes[agentId];
      const aiCamera = aiCameraRefs.current[agentId];
      const aiRenderTarget = aiRenderTargetRefs.current[agentId];

      if (!agentState || !aiCamera || !aiRenderTarget) {
        console.warn(
          `[AI Controller] Missing state/camera/target for ${agentId} during image extraction`,
        );
        return null;
      }

      aiCamera.position.copy(agentState.position);
      aiCamera.lookAt(agentState.lookAt);

      const originalRenderTarget = gl.getRenderTarget();
      const originalOutputColorSpace = gl.outputColorSpace;

      gl.setRenderTarget(aiRenderTarget);
      gl.outputColorSpace = LinearSRGBColorSpace;
      gl.render(mainScene, aiCamera);

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

      gl.setRenderTarget(originalRenderTarget);
      gl.outputColorSpace = originalOutputColorSpace;

      return imageDataUrl;
    },
    [gl, mainScene, managedEyes],
  );

  const updateLiveView = useCallback(
    (agentId: string) => {
      const imageDataUrl = extractImageDataFromRenderer(agentId);
      if (imageDataUrl) {
        setAIAgentView(agentId, imageDataUrl);
      }
    },
    [extractImageDataFromRenderer, setAIAgentView],
  );

  const handleAIDecisionAndAction = useCallback(
    async (agentId: string) => {
      if (decisionProcessingLock.current.has(agentId)) return;
      decisionProcessingLock.current.add(agentId);

      try {
        const imageDataUrl = extractImageDataFromRenderer(agentId);
        if (!imageDataUrl) {
          console.warn(
            `[AI Controller] Could not get image data for ${agentId} decision.`,
          );
          return;
        }

        const chatHistory = getMessages.slice(-10);

        console.log(
          `[AI Controller] Requesting decision for ${agentId} with image data (length: ${imageDataUrl.length})`,
        );
        const movementAction: AIAction = await requestAiDecision(
          agentId,
          imageDataUrl,
          chatHistory,
        );

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
              const actualMoveDirection = forwardVector.clone();
              if (movementAction.direction === "backward") {
                actualMoveDirection.negate();
              }
              const displacement = actualMoveDirection.multiplyScalar(
                movementAction.distance,
              );

              newPosition.copy(currentPosition).add(displacement);
              newLookAt.copy(currentLookAt).add(displacement);

              newPosition.y = EYE_Y_POSITION;
            } else if (movementAction.type === "turn") {
              const angleRad = (movementAction.degrees * Math.PI) / 180;
              const axis = new Vector3(0, 1, 0);
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
              newPosition = currentPosition;
            }

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
            } else {
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
          `[AI Controller] Error processing agent decision ${agentId}:`,
          error,
        );
      } finally {
        lastDecisionTime.current[agentId] = Date.now();
        decisionProcessingLock.current.delete(agentId);
      }
    },
    [
      extractImageDataFromRenderer,
      getMessages,
      managedEyes,
      // requestAiDecision is a server action, typically stable
    ],
  );

  useFrame(() => {
    if (agents.length === 0) return;
    const now = Date.now();

    for (const agent of agents) {
      if (agent.id === myId) continue;

      if (
        now - (lastVisualUpdateTime.current[agent.id] || 0) >
        VISUAL_UPDATE_INTERVAL_MS
      ) {
        updateLiveView(agent.id);
        lastVisualUpdateTime.current[agent.id] = now;
      }

      if (
        now - (lastDecisionTime.current[agent.id] || 0) >
        DECISION_MAKING_INTERVAL_MS
      ) {
        if (!decisionProcessingLock.current.has(agent.id)) {
          handleAIDecisionAndAction(agent.id);
        }
      }
    }
  });
};
