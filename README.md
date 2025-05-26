# Planeo

[![CI/CD](https://github.com/rgilks/planeo/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeo/actions/workflows/fly.yml)

![planeo Screenshot](/screenshots/loaded.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;margin-bottom: 20px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

## Core Features

- **3D Environment:** Interactive 3D space built with React Three Fiber.
- **Real-time Multi-user Interaction:** See other users' movements (represented as eyeballs) in real-time using Server-Sent Events (SSE).
- **AI Agents with Synchronized Actions & Speech:** Two AI agents ("AI-1" and "AI-2") are present by default. They generate chat messages and actions (like moving or turning) based on visual stimuli. Their actions are performed on the client, and the associated chat message's audio is played. The next AI decision cycle for an agent is triggered only after its current audio playback completes, ensuring a synchronized and more natural interaction flow. AI agent views update visually at ~10 FPS. ([Details](/docs/ai-agents.md), [Vision Details](/docs/ai-agent-vision.md), [New Interaction Flow](/docs/ai-interaction-flow.md))
- **Chat Functionality:** View messages from AI agents in a shared chat window. ([Details](/docs/chat.md))
- **Text-to-Speech (TTS):** Chat messages from AI agents are spoken aloud. The system now uses a test audio track for this feature during development. ([Details](/docs/text-to-speech.md))
- **Keyboard Navigation:** Control camera movement and orientation using keyboard inputs.

## Simulation Start

**Important:** To ensure audio playback (like AI agent speech) functions correctly due to browser policies, you must now click on the screen to start the simulation. An overlay will prompt this action upon loading.

## Planned Features

The following features are planned for future development:

- **AI Services:** Potential integration with Google Cloud Text-to-Speech and Google GenAI.
- **Enhanced World Interaction:** More ways for users and AI to interact with the 3D environment.

## Technical Documentation

More detailed technical documentation for various aspects of the project can be found in the `docs/` folder:

- `docs/ai-agents.md`: Details on AI agent behavior, configuration, and capabilities.
- `docs/ai-agent-vision.md`: Describes how AI agents perceive and display their environment.
- `docs/ai_services.md`: Information on external AI services integrated or planned.
- `docs/chat.md`: Overview of the chat system.
- `docs/physics.md`: Explanation of the physics simulation for objects in the 3D scene.
- `docs/real-time-camera-movement.md`: Covers how camera/user movements are handled and synchronized.
- `docs/sse-event-handling.md`: Describes the Server-Sent Events (SSE) mechanism for real-time updates.
- `docs/text-to-speech.md`: Information on the text-to-speech functionality for chat messages.

## Recent Developments

- **New AI Interaction Flow with Audio Synchronization (Recent Major Change):** The core AI agent interaction loop has been refactored. The Language Model (LLM) now returns both a chat message and an action. The backend generates an audio source for the chat message. On the client-side, an orchestrator component manages performing the AI's action and then playing the generated audio. Crucially, the next request to the LLM for that agent is only made after the audio playback for its current message has completed. This ensures actions and speech are synchronized and prevents rapid, out-of-sync requests. ([Details](/docs/ai-interaction-flow.md))
- **Enhanced Physics: Physical Eyes & Wider Cube Spread (2025-07-29):** The physics simulation has been updated. User eyeballs are now physical objects (`kinematicPosition` `RigidBody`) that can interact with and push the falling cubes. The initial scattering area for the cubes has also been quadrupled. See `docs/physics.md` for more details.
- **Configurable AI Agents via Environment Variable (Relevant Recent Change):** AI agent system now supports a variable number of agents defined via the `AI_AGENTS_CONFIG` environment variable. ([Details](/docs/ai-agents.md))
- **Visual Fix (2024-07-28):** Resolved a Z-fighting issue causing flickering between eyeballs and the background grid by adjusting object positioning and camera clipping planes.

## Environment Variables

- `REPLICATE_API_TOKEN`: Your Replicate API token.
- `TOTAL_AGENTS`: The maximum number of agents allowed in the environment (e.g., 10).

### Environment Variables for Production
