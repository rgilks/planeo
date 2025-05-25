# Real-time Camera Movement and Orientation

**Date:** 2025-05-25 (Updated 2025-05-25 for new controls)

## Overview

This document outlines the implementation of real-time camera movement and orientation using keyboard controls. Changes in camera position and orientation (yaw) are broadcast to other connected users, enabling a shared interactive experience. Mouse look is currently disabled.

## Implementation Details

### 1. Keyboard Input Handling

- **Component:** `src/app/components/Scene.tsx`
- **Hook:** `useKeyboardControls` (existing)
- The `useKeyboardControls` hook tracks the state of pressed keys.
- The `useFrame` hook within the `CanvasContent` component handles camera updates based on key presses.

### 2. Camera Control Logic

- **Component:** `src/app/components/Scene.tsx` (`CanvasContent`)
- **Look (Yaw Rotation):**
  - `A` / `ArrowLeft`: Rotates the camera view to the left (increases `camera.rotation.y`).
  - `D` / `ArrowRight`: Rotates the camera view to the right (decreases `camera.rotation.y`).
  - Rotation speed is controlled by `rotationSpeed`.
  - The camera does not pitch (look up/down); it remains level with the horizon.
- **Movement:**
  - `W` / `ArrowUp`: Moves the camera forward along its current facing direction.
  - `S` / `ArrowDown`: Moves the camera backward from its current facing direction.
  - Movement speed is controlled by `zoomSpeed`.
- The camera's Y-position is constrained to a minimum value (e.g., `2`) to prevent it from passing through the visual ground plane.
- Mouse look (`PointerLockControls`) has been disabled.

### 3. Position Broadcasting

- **Hook:** `src/hooks/useEyePositionReporting.ts`
- This hook periodically (every `LOCAL_INTERVAL_MS`) checks the camera's current position and look-at vector.
- If the rounded position or look-at vector has changed since the last sent update, or if a `FORCE_POSITION_UPDATE_INTERVAL_MS` has elapsed, an `eyeUpdate` event is created.
- The event payload includes:
  - `type: "eyeUpdate"`
  - `id`: The user's unique identifier.
  - `p`: The camera's rounded 3D position `[x, y, z]` (if changed or forced).
  - `l`: The camera's rounded 3D look-at point `[x, y, z]` (if changed or forced).
  - `t`: Timestamp of the event.
- The event is sent to the `/api/events` endpoint using `navigator.sendBeacon()` for reliable background transmission.

### 4. Server-Side Event Handling

- **API Route:** `src/app/api/events/route.ts`
- The `POST` handler receives the `eyeUpdate` event.
- It validates the payload against `ValidatedEyeUpdatePayloadSchema`.
- If valid, the `setEye` function in `src/app/api/events/sseStore.ts` is called.
- `setEye` updates the server's record of the user's eye position and then calls `broadcast`.
- `broadcast` sends the `eyeUpdate` event data to all subscribed clients via Server-Sent Events (SSE).

### 5. Client-Side Event Reception and Rendering

- **Store:** `src/stores/eventStore.ts` (`useEventStore`)
  - Manages the SSE connection.
  - Receives messages, parses them using `EventSchema`.
  - For `eyeUpdate` events, it notifies subscribed listeners.
- **Hook:** `src/hooks/useEyes.ts`
  - Subscribes to `eyeUpdate` events from `useEventStore`.
  - Updates the `useEyeStore` with the new eye data.
- **Store:** `src/stores/eyeStore.ts` (`useEyeStore`)
  - Stores the state of all users' eyes (positions and look-at vectors).
- **Component:** `src/app/components/Eyes.tsx` (or similar)
  - Uses the `useEyes` hook to get the current eye data for all users.
  - Renders the visual representation of each eye in the 3D scene based on their latest position and orientation.

## Key Files Involved

- `src/app/components/Scene.tsx`: Handles keyboard input and camera updates.
- `src/hooks/useEyePositionReporting.ts`: Sends local camera changes to the server.
- `src/domain/event.ts`: Defines the Zod schema for `EyeUpdateType`.
- `src/app/api/events/route.ts`: API endpoint for receiving events.
- `src/app/api/events/sseStore.ts`: Manages SSE connections and broadcasts events.
- `src/stores/eventStore.ts`: Client-side SSE handling and event dispatching.
- `src/hooks/useEyes.ts`: Client-side subscription to eye updates for rendering.
- `src/stores/eyeStore.ts`: Client-side storage of eye data.
- `src/app/components/Eyes.tsx`: Renders the eyes of other users.
