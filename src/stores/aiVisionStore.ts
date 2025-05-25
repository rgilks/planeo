import { create } from "zustand";

interface AIVisionState {
  aiAgentViews: Record<string, string | undefined>; // Store imageDataUrl per agentId
  setAIAgentView: (agentId: string, imageDataUrl: string) => void;
}

export const useAIVisionStore = create<AIVisionState>((set) => ({
  aiAgentViews: {},
  setAIAgentView: (agentId, imageDataUrl) =>
    set((state) => ({
      aiAgentViews: {
        ...state.aiAgentViews,
        [agentId]: imageDataUrl,
      },
    })),
}));
