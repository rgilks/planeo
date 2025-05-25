# Planeo

[![CI/CD](https://github.com/rgilks/planeo/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeo/actions/workflows/fly.yml)

![planeo Screenshot](/screenshots/loaded.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;margin-bottom: 20px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

## Core Features

- **3D Environment:** Interactive 3D space built with React Three Fiber.
- **Real-time Multi-user Interaction:** See other users' movements (represented as eyeballs) in real-time using Server-Sent Events (SSE).
- **Chat Functionality:** Send and receive messages in a shared chat window.
- **Keyboard Navigation:** Control camera movement and orientation using keyboard inputs.

## Planned Features

The following features are planned for future development:

- **Physics Integration:** Using Rapier3D for realistic physics interactions.
- **AI Services:** Potential integration with Google Cloud Text-to-Speech and Google GenAI.
- **Authentication:** User authentication via NextAuth.
- **Database Integration:** Utilizing a local SQLite database via better-sqlite3 for persistent data storage.

## Recent Developments

- **Chat Functionality (2025-05-25):** Users can now send and receive messages in a chat window. Messages are displayed with user identifiers and timestamps.
- **Keyboard-Only Look Controls (2025-05-25):** Player look (camera orientation) is now controlled exclusively by keyboard. A/D keys or Left/Right arrow keys rotate the view left/right (yaw). Mouse look has been disabled. W/S or Up/Down arrow keys move forward/backward relative to the current view direction.
- **Arrow Key Navigation (2025-05-25):** Users can now move their viewpoint (eye) around the plane using the arrow keys (up, down, left, right) in addition to WASD controls. These movements are broadcast to other connected users in real-time.
- **Visual Fix (2024-07-28):** Resolved a Z-fighting issue causing flickering between eyeballs and the background grid by adjusting object positioning and camera clipping planes. More details can be found in `docs/rendering_issues.md`.
