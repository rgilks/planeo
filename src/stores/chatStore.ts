import { create } from "zustand";

interface ChatState {
  isChatVisible: boolean;
  toggleChatVisibility: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  isChatVisible: false,
  toggleChatVisibility: () =>
    set((state) => ({ isChatVisible: !state.isChatVisible })),
}));
