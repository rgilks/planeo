# Real-time Camera Movement with Arrow Keys

**Date:** 2025-05-25

## Overview

This document outlines the implementation of real-time camera movement using arrow keys, allowing users to navigate their viewpoint within the 3D scene. Changes in camera position are broadcast to other connected users, enabling a shared an interactive experience.

## Implementation Details

### 1. Keyboard Input Handling

- **Component:** `src/app/components/Scene.tsx`
- **Hook:** `useKeyboardControls` (existing)
- The `useKeyboardControls` hook tracks the state of pressed keys.
- The `useFrame` hook within the `CanvasContent` component was modified to listen for `ArrowUp`, `ArrowDown`, `ArrowLeft`, and `ArrowRight` key presses.

### 2. Camera Movement Logic

- **Component:** `src/app/components/Scene.tsx` (`CanvasContent`)
- When an arrow key is pressed:
  - `ArrowUp`/`W`: The camera moves forward along its current look direction.
  - `ArrowDown`/`S`: The camera moves backward along its current look direction.
  - `ArrowLeft`/`A`: The camera strafes left, perpendicular to its current look direction.
  - `ArrowRight`/`D`: The camera strafes right, perpendicular to its current look direction.
- Movement speed for forward/backward is controlled by `zoomSpeed`, and for strafing by `moveSpeed`.
- The camera's Y-position is constrained to a minimum value (e.g., `2`) to prevent it from passing through the visual ground plane.

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
