# Rendering Issues and Resolutions

This document outlines common rendering issues encountered in the Planeo project and the steps taken to resolve them.

## Z-Fighting: Eyeball and Grid Flickering

**Issue:** Users reported a flickering effect where the background grid would sometimes appear to show through the eyeball meshes, or the eyeball surface itself would flicker, especially during camera rotation.

**Cause:** This visual artifact is known as Z-fighting. It occurs when two or more polygons (surfaces) are so close together along the camera's line of sight that the GPU's depth buffer has insufficient precision to determine which polygon is in front of the other. This leads to an inconsistent rendering frame-to-frame, causing the observed flickering.

In our case, the specific causes were:

1.  **Incorrect Vertical Positioning:** The calculated Y-position for the eyeballs, combined with their radius, resulted in the bottom surface of the eyeball sphere being slightly below or at the same level as the grid plane.
    - Initial Grid Y position: approx. -19.99
    - Initial Eyeball bottom Y position: approx. -20.5
2.  **Depth Buffer Precision:** A very wide range between the camera's near and far clipping planes (e.g., `near: 0.1`, `far: 4000`) can reduce the precision of the depth buffer, especially for objects far from the near plane but close to each other.

**Resolution:**

A combination of aprimary_focus_on_the_user_querypproaches was used to mitigate this issue:

1.  **Adjusted Eyeball Vertical Position:**

    - The `EYE_RADIUS` was centralized in `src/domain/sceneConstants.ts`.
    - The `EYE_Y_POSITION` in `src/domain/sceneConstants.ts` was recalculated to ensure the bottom of the eyeball sphere is always slightly above the grid:
      `EYE_Y_POSITION = GRID_Y_POSITION + EYE_RADIUS + 0.1;`
      This placed the eyeball bottom at Y = -19.9, safely above the grid at Y = -19.99.

2.  **Narrowed Camera Clipping Planes:**
    - In `src/app/components/Scene.tsx`, the camera's clipping planes were adjusted from `near: 0.1, far: 4000` to `near: 1, far: 2500`. This increases depth buffer precision across the visible scene depth. The `far` plane value was chosen to still accommodate the grid's `fadeDistance` of 2000.

These changes ensure that the eyeball is rendered consistently in front of the grid and improves overall depth sorting, resolving the flickering.
