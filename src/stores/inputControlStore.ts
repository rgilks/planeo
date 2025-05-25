import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface State {
  isChatInputFocused: boolean;
}

interface Actions {
  setChatInputFocused: (isFocused: boolean) => void;
}

export const useInputControlStore = create<State & Actions>()(
  immer((set) => ({
    isChatInputFocused: false,
    setChatInputFocused: (isFocused) =>
      set((state) => {
        state.isChatInputFocused = isFocused;
      }),
  })),
);
