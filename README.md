# Planeo

[![CI/CD](https://github.com/rgilks/planeo/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeo/actions/workflows/fly.yml)

![planeo Screenshot](/screenshots/loaded.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;margin-bottom: 20px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

## Core Features

- **3D Environment:** Interactive 3D space built with React Three Fiber.
- **Real-time Multi-user Interaction:** See other users' movements (represented as eyeballs) in real-time using Server-Sent Events (SSE).
- **AI Agents:** Two AI agents ("AI-1" and "AI-2") are present by default, each with a unique eyeball and chat identity. Their number and properties can be configured via the `AI_AGENTS_CONFIG` environment variable. They can generate chat messages and respond to visual stimuli, with actions broadcast in real-time. ([Details](/docs/ai-agents.md))
- **Chat Functionality:** Send and receive messages in a shared chat window.
- **Text-to-Speech (TTS):** Chat messages from other users are spoken aloud with a distinct voice for each user. ([Details](/docs/text-to-speech.md))
- **Keyboard Navigation:** Control camera movement and orientation using keyboard inputs.

## Simulation Start

**Important:** To ensure audio playback (like AI agent speech) functions correctly due to browser policies, you must now click on the screen to start the simulation. An overlay will prompt this action upon loading.

## Planned Features

The following features are planned for future development:

- **AI Services:** Potential integration with Google Cloud Text-to-Speech and Google GenAI.
- **Authentication:** User authentication via NextAuth.
- **Database Integration:** Utilizing a local SQLite database via better-sqlite3 for persistent data storage.
- **Enhanced AI Agent View Updates:** AI agent views (Orion and Nova) now update visually much more frequently (~10 FPS), while their decision-making (LLM invocation) rate remains controlled to optimize performance and cost.

## Technical Documentation

More detailed technical documentation for various aspects of the project can be found in the `docs/` folder:

- `docs/ai-agents.md`: Details on AI agent behavior, configuration, and capabilities.
- `docs/ai_services.md`: Information on external AI services integrated or planned.
- `docs/physics.md`: Explanation of the physics simulation for objects in the 3D scene.
- `docs/real-time-camera-movement.md`: Covers how camera/user movements are handled and synchronized.
- `docs/sse-event-handling.md`: Describes the Server-Sent Events (SSE) mechanism for real-time updates, including synchronization of box (cube) states like color and position.
- `docs/text-to-speech.md`: Information on the text-to-speech functionality for chat messages.

## Recent Developments

- **Enhanced Physics: Physical Eyes & Wider Cube Spread (2025-07-29):** The physics simulation has been updated. User eyeballs are now physical objects (`kinematicPosition` `RigidBody`) that can interact with and push the falling cubes. The initial scattering area for the cubes has also been quadrupled. See `docs/physics.md` for more details.
- **Physics Integration with Falling Cubes (YYYY-MM-DD):** Added a physics simulation using `react-three-rapier`. When the scene loads, a number of randomly sized and colored cubes fall from the sky, bounce, and settle due to gravity. See `docs/physics.md` for more information.
- **Default Visible AI Agents & Unique Identities (YYYY-MM-DD):** Implemented default visibility for two AI agents ("AI-1", "AI-2") upon loading. They now have distinct names in chat and appear as separate entities in the 3D space. The system still supports configuration via `AI_AGENTS_CONFIG` for custom setups.
- **Configurable AI Agents (YYYY-MM-DD):** Refactored the AI agent system to support a variable number of agents defined via the `AI_AGENTS_CONFIG` environment variable. This replaces the previously hardcoded two-agent system. See `docs/ai-agents.md` for more information.
- **Multi-AI Agent System (YYYY-MM-DD):** Introduced two AI agents, Iris and Cyan, capable of independent chat and vision-based responses. Their activities are broadcast via the event stream. See `docs/ai-agents.md` for more information.
- **Text-to-Speech for Chat (2025-05-25):** Implemented text-to-speech for chat messages. Messages from other users are now read aloud using distinct, consistent voices. The system utilizes Google Cloud TTS. More details can be found in `docs/text-to-speech.md`.
- **Chat Functionality (2025-05-25):** Users can now send and receive messages in a chat window. Messages are displayed with user identifiers and timestamps.
- **Keyboard-Only Look Controls (2025-05-25):** Player look (camera orientation) is now controlled exclusively by keyboard. A/D keys or Left/Right arrow keys rotate the view left/right (yaw). Mouse look has been disabled. W/S or Up/Down arrow keys move forward/backward relative to the current view direction.
- **Arrow Key Navigation (2025-05-25):** Users can now move their viewpoint (eye) around the plane using the arrow keys (up, down, left, right) in addition to WASD controls. These movements are broadcast to other connected users in real-time.
- **Visual Fix (2024-07-28):** Resolved a Z-fighting issue causing flickering between eyeballs and the background grid by adjusting object positioning and camera clipping planes. More details can be found in `docs/rendering_issues.md`.

## Environment Variables

- `REPLICATE_API_TOKEN`: Your Replicate API token.
- `TOTAL_AGENTS`: The maximum number of agents allowed in the environment (e.g., 10).

### Environment Variables for Production
