# Planeo

[![CI/CD](https://github.com/rgilks/planeo/actions/workflows/fly.yml/badge.svg)](https://github.com/rgilks/planeo/actions/workflows/fly.yml)

![planeo Screenshot](/screenshots/loaded.png)

<div align="center">
  <a href='https://ko-fi.com/N4N31DPNUS' target='_blank'><img height='36' style='border:0px;height:36px;margin-bottom: 20px;' src='https://storage.ko-fi.com/cdn/kofi2.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>
</div>

## Recent Developments

- **Keyboard-Only Look Controls (2025-05-25):** Player look (camera orientation) is now controlled exclusively by keyboard. A/D keys or Left/Right arrow keys rotate the view left/right (yaw). Mouse look has been disabled. W/S or Up/Down arrow keys move forward/backward relative to the current view direction.
- **Arrow Key Navigation (2025-05-25):** Users can now move their viewpoint (eye) around the plane using the arrow keys (up, down, left, right) in addition to WASD controls. These movements are broadcast to other connected users in real-time.
- **Visual Fix (2024-07-28):** Resolved a Z-fighting issue causing flickering between eyeballs and the background grid by adjusting object positioning and camera clipping planes. More details can be found in `docs/rendering_issues.md`.
