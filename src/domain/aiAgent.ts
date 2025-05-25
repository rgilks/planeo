import { z } from "zod";

export const AIAgentSchema = z.object({
  id: z.string(), // Using non-UUID strings for easier reference, e.g., "ai-iris"
  displayName: z.string(),
  // Future properties like personality, memory configuration can be added here
});

export type AIAgent = z.infer<typeof AIAgentSchema>;

// Store the parsed agents to avoid reprocessing the env var on every call in the same context
let parsedAIAgents: AIAgent[] | null = null;

export const getAIAgents = (): AIAgent[] => {
  if (parsedAIAgents !== null) {
    return parsedAIAgents;
  }

  const configJson = process.env["AI_AGENTS_CONFIG"];
  if (!configJson) {
    console.warn(
      "[AI Agents] AI_AGENTS_CONFIG environment variable is not set. No AI agents will be loaded.",
    );
    parsedAIAgents = [];
    return [];
  }

  try {
    const config = JSON.parse(configJson);
    const result = z.array(AIAgentSchema).safeParse(config);
    if (result.success) {
      parsedAIAgents = result.data;
      console.log(
        `[AI Agents] Successfully loaded ${result.data.length} AI agents.`,
      );
      return result.data;
    } else {
      console.error(
        "[AI Agents] Failed to parse AI_AGENTS_CONFIG:",
        result.error.flatten(),
      );
      parsedAIAgents = [];
      return [];
    }
  } catch (error) {
    console.error("[AI Agents] Invalid JSON in AI_AGENTS_CONFIG:", error);
    parsedAIAgents = [];
    return [];
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
