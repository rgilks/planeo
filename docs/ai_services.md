# AI Services Integration

This document outlines the AI services used in Planeo, focusing on Google GenAI for agent behavior.

## AI Agent Behavior (Google GenAI)

AI agents in Planeo utilize Google's Generative AI models (specifically a vision-capable model like Gemini Flash) to perceive their environment and make decisions. This process involves:

1.  **Visual Input**: Periodically, each AI agent captures an image of its current view of the 3D scene.
2.  **Chat History**: The recent chat history is provided as context.
3.  **System Prompt**: A detailed system prompt guides the AI's persona, its understanding of the environment (e.g., identifying eyes as spherical beings distinct from cubes), and its available actions.
4.  **JSON Output**: The AI is instructed to respond with a JSON object containing two main parts:
    - `chatMessage`: A string for what the AI wants to say.
    - `action`: An object defining the AI's next physical action.

### AI Actions

AI agents can perform the following actions:

- **Move**: `{ "type": "move", "direction": "forward" | "backward", "distance": number }`
- **Turn**: `{ "type": "turn", "direction": "left" | "right", "degrees": number }`
- **None**: `{ "type": "none" }` (no physical action)

### Prompt Engineering

The system prompt is crucial for shaping the AI's behavior, including:

- Its sense of self and initial reactions (e.g., disorientation, curiosity).
- Its understanding of different entities in the scene (e.g., other spherical eyes vs. cubes).
- Its communication style and decision-making process for actions.
- Encouraging specific behaviors like looking at the interlocutor during chat.

_(Further details on GenAI model versions, specific prompt iterations, and safety settings will be added as the system evolves.)_
