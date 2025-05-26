import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import type { Message } from "@/domain/message";

// --- Chat UI Slice ---
interface ChatUIState {
  isChatVisible: boolean;
  isChatInputFocused: boolean;
}

interface ChatUIActions {
  toggleChatVisibility: () => void;
  setChatInputFocused: (isFocused: boolean) => void;
}

const initialChatUIState: ChatUIState = {
  isChatVisible: false,
  isChatInputFocused: false,
};

// --- Messages Slice ---
interface MessagesState {
  messages: Message[];
}

interface MessagesActions {
  addMessage: (message: Message) => void;
}

const initialMessagesState: MessagesState = {
  messages: [],
};

// --- Combined Store ---
export interface CommunicationState extends ChatUIState, MessagesState {}
export interface CommunicationActions extends ChatUIActions, MessagesActions {}

export const useCommunicationStore = create<
  CommunicationState & CommunicationActions
>()(
  immer((set) => ({
    ...initialChatUIState,
    ...initialMessagesState,

    // Chat UI Actions
    toggleChatVisibility: () =>
      set((state) => {
        state.isChatVisible = !state.isChatVisible;
      }),
    setChatInputFocused: (isFocused) =>
      set((state) => {
        state.isChatInputFocused = isFocused;
      }),

    // Messages Actions
    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),
  })),
);
