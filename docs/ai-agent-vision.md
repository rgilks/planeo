# AI Agent Vision System

This document details the implementation of the AI agent vision system in Planeo, focusing on how Orion and Nova perceive and display their environment.

## Overview

AI agents in Planeo, such as Orion and Nova, have their own virtual cameras within the 3D scene. These cameras are used to capture images of their surroundings, providing them with visual input for decision-making and displaying their perspective to the user.

## View Rendering and Updates

- **Capture Mechanism**: The `useAIAgentController` hook (`src/hooks/useAIAgentController.ts`) is responsible for managing AI agents' vision.

  - Each AI agent has a dedicated `PerspectiveCamera` and a `WebGLRenderTarget`.
  - The visual representation (what the AI "sees") is updated frequently, controlled by `VISUAL_UPDATE_INTERVAL_MS` (currently 100 milliseconds, aiming for ~10 FPS). This involves rendering the scene from the AI's perspective and updating the displayed image.
  - The AI's decision-making process, which includes calling an LLM, happens less frequently, controlled by `DECISION_MAKING_INTERVAL_MS` (currently 7000 milliseconds). This ensures that visual updates are fast and fluid, while LLM calls are made at a more controlled rate.
  - The rendered image for both visual updates and decision-making is converted to a data URL (PNG format).

- **State Management**: The generated image data URL for each AI agent (from the frequent visual updates) is stored in a Zustand store (`useAIVisionStore` in `src/stores/aiVisionStore.ts`) using the `setAIAgentView` action.

- **Display Component**:
  - The `AIAgentViews` component (`src/app/components/AIAgentViews.tsx`) subscribes to the `useAIVisionStore`.
  - When the image data URL for an agent updates in the store, this component re-renders, displaying the new image in the top-left and top-right corners of the screen.
  - The images are displayed at a resolution of 160x100 pixels, scaled down from the capture resolution of 320x200 pixels.

## Real-time Experience

The `VISUAL_UPDATE_INTERVAL_MS` in `useAIAgentController.ts` dictates the frequency of the displayed view updates, providing a near real-time feed. The `DECISION_MAKING_INTERVAL_MS` controls how often the AI processes this visual information (along with chat history) to make decisions and perform actions. This separation ensures responsive visuals without overloading the AI decision-making services.

This ensures that the views displayed are an accurate representation of what each AI agent's virtual camera is capturing from the scene, updated frequently.

## Future Considerations

- **Performance**: Very frequent updates (e.g., 30-60 FPS) could impact performance, especially with multiple AI agents. The current interval is a balance between real-time feel and resource usage.
