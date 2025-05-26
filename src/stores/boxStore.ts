import { create } from "zustand";

import { type Vec3, type BoxEventType } from "@/domain";

export interface BoxState {
  id: string;
  p: Vec3;
  o: Vec3;
  c: string;
  t: number;
}

interface BoxStoreState {
  boxes: Map<string, BoxState>;
  handleBoxEvent: (boxData: BoxEventType) => void;
}

export const useBoxStore = create<BoxStoreState>((set) => ({
  boxes: new Map(),
  handleBoxEvent: (boxData) => {
    if (!boxData || !boxData.p || !boxData.o || !boxData.c) {
      console.warn(
        "[Client boxStore] Received incomplete boxData (missing p, o, or c), ignoring:",
        boxData,
      );
      return;
    }
    console.log(
      "[Client boxStore] Handling box event:",
      JSON.parse(JSON.stringify(boxData)),
    );
    set((state) => {
      const newBoxes = new Map(state.boxes);
      const boxState: BoxState = {
        id: boxData.id,
        p: boxData.p,
        o: boxData.o,
        c: boxData.c,
        t: boxData.t,
      };
      newBoxes.set(boxData.id, boxState);
      console.log(
        `[Client boxStore] Box ${boxData.id} upserted. Current boxes count: ${newBoxes.size}. Box state:`,
        JSON.parse(JSON.stringify(boxState)),
      );
      return { boxes: newBoxes };
    });
  },
}));
