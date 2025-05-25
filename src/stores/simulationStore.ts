import { create } from "zustand";

interface SimulationState {
  isStarted: boolean;
  setIsStarted: (isStarted: boolean) => void;
}

export const useSimulationStore = create<SimulationState>((set) => ({
  isStarted: false,
  setIsStarted: (isStarted) => set({ isStarted }),
}));
