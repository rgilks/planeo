# Physics System

This document outlines the physics system implemented in Planeo, utilizing `react-three-rapier` for realistic physics interactions within the 3D environment.

## Falling Cubes

Upon the initial loading of the main scene, a collection of cubes with random sizes and colors is introduced. These cubes:

- Are spawned at random positions above the ground plane.
- Fall from the sky due to simulated gravity.
- Interact with each other and the ground plane, bouncing and eventually settling in random locations.

### Implementation Details

- **Physics Engine:** The simulation is powered by `react-three-rapier`, a wrapper around the Rapier physics engine for React Three Fiber.
- **Components:**
  - `FallingCubes.tsx`: This component is responsible for generating and managing the falling cubes. It defines the properties of each cube (initial position, size, color) and uses `RigidBody` components from `react-three-rapier` to give them physical properties.
  - `Scene.tsx`: The main scene component integrates the `FallingCubes` and wraps the relevant parts of the scene within a `<Physics>` component provided by `react-three-rapier`. This establishes the physics world where simulations occur.
- **Ground Plane:** A static `RigidBody` with a `CuboidCollider` acts as the ground, preventing the cubes from falling indefinitely.

### Future Enhancements

- More complex object interactions.
- User interaction with physics objects.
- Performance optimizations for a larger number of physics bodies.
