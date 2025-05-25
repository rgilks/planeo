import { z } from "zod";

export const AIAgentSchema = z.object({
  id: z.string(), // Using non-UUID strings for easier reference, e.g., "ai-iris"
  displayName: z.string(),
  // Future properties like personality, memory configuration can be added here
});

export type AIAgent = z.infer<typeof AIAgentSchema>;

// Store the parsed agents to avoid reprocessing the env var on every call in the same context
let parsedAIAgents: AIAgent[] | null = null;

const defaultAIAgents: AIAgent[] = [
  { id: "ai-agent-1", displayName: "AI-1" },
  { id: "ai-agent-2", displayName: "AI-2" },
];

export const getAIAgents = (): AIAgent[] => {
  if (parsedAIAgents !== null) {
    return parsedAIAgents;
  }

  const configJson = process.env["AI_AGENTS_CONFIG"];
  if (!configJson) {
    console.warn(
      "[AI Agents] AI_AGENTS_CONFIG environment variable is not set. Using default AI agents.",
    );
    parsedAIAgents = defaultAIAgents;
    return parsedAIAgents;
  }

  try {
    const config = JSON.parse(configJson);
    const result = z.array(AIAgentSchema).safeParse(config);
    if (result.success && result.data.length > 0) {
      // Ensure data is not empty
      parsedAIAgents = result.data;
      console.log(
        `[AI Agents] Successfully loaded ${result.data.length} AI agents from AI_AGENTS_CONFIG.`,
      );
      return result.data;
    } else {
      if (!result.success) {
        console.error(
          "[AI Agents] Failed to parse AI_AGENTS_CONFIG:",
          result.error.flatten(),
        );
      } else {
        console.warn(
          "[AI Agents] AI_AGENTS_CONFIG was empty or invalid. Using default AI agents.",
        );
      }
      parsedAIAgents = defaultAIAgents;
      return parsedAIAgents;
    }
  } catch (error) {
    console.error("[AI Agents] Invalid JSON in AI_AGENTS_CONFIG:", error);
    parsedAIAgents = defaultAIAgents;
    return parsedAIAgents;
  }
};

export const isAIAgentId = (userId: string): boolean => {
  const agents = getAIAgents();
  return agents.some((agent) => agent.id === userId);
};

// Example of how you might get a specific agent's details if needed
export const getAIAgentById = (userId: string): AIAgent | undefined => {
  const agents = getAIAgents();
  return agents.find((agent) => agent.id === userId);
};
