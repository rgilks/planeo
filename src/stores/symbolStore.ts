import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { SymbolInput } from "@/domain";

type RemoteKey = { key: string; ts: number };

type State = {
  lastInput: SymbolInput | null;
  setLastInput: (input: SymbolInput) => void;
  remoteKeys: Record<string, RemoteKey>;
  setRemoteKey: (id: string, key: string) => void;
};

export const useSymbolStore = create<State>()(
  immer((set) => ({
    lastInput: null,
    setLastInput: (input) =>
      set((state) => {
        state.lastInput = input;
      }),
    remoteKeys: {},
    setRemoteKey: (id, key) =>
      set((state) => {
        if (key) {
          state.remoteKeys[id] = { key, ts: Date.now() };
        } else {
          delete state.remoteKeys[id];
        }
      }),
  })),
);

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  window.__symbolStore = useSymbolStore;
}

export type { State, State as RemoteKeyState };
