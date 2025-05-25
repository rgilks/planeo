import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { Message } from "@/domain/message";

interface State {
  messages: Message[];
}

interface Actions {
  addMessage: (message: Message) => void;
}

export const useMessageStore = create<State & Actions>()(
  immer((set) => ({
    messages: [],
    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),
  })),
);
