# Physics System

This document outlines the physics system implemented in Planeo, utilizing `react-three-rapier` for realistic physics interactions within the 3D environment.

## Falling Cubes

Upon the initial loading of the main scene, a collection of cubes with random sizes and colors is introduced. These cubes:

- Are spawned at random positions above the ground plane, scattered over a wide area.
- Fall from the sky due to simulated gravity.
- Interact with each other and the ground plane, bouncing and eventually settling in random locations.

## Eyes

User representations (eyeballs) are also part of the physics simulation:

- Each eye is a `kinematicPosition` `RigidBody`, meaning its movement is controlled by the application (user input or AI) but it can push and interact with other dynamic physics objects (like the falling cubes).
- They have a `BallCollider` to represent their physical shape.

### Implementation Details

- **Physics Engine:** The simulation is powered by `react-three-rapier`, a wrapper around the Rapier physics engine for React Three Fiber.
- **Components:**
  - `FallingCubes.tsx`: This component is responsible for generating and managing the falling cubes. It defines the properties of each cube (initial position, size, color) and uses `RigidBody` components from `react-three-rapier` to give them physical properties.
  - `Eye.tsx` and `Eyes.tsx`: These components manage the creation and behavior of the eye representations. Each eye is a `RigidBody` with a `BallCollider`. Their positions and rotations are updated kinematically in the `useFrame` loop within `Eyes.tsx`.
  - `Scene.tsx`: The main scene component integrates the `FallingCubes` and `Eyes`, and wraps the relevant parts of the scene within a `<Physics>` component provided by `react-three-rapier`. This establishes the physics world where simulations occur.
- **Ground Plane:** A static `RigidBody` with a `CuboidCollider` acts as the ground, preventing the cubes from falling indefinitely.

### Future Enhancements

- More complex object interactions.
- User interaction with physics objects (e.g., directly grabbing or throwing cubes).
- Performance optimizations for a larger number of physics bodies.
- Synchronization of cube positions across clients for a shared physics experience.
