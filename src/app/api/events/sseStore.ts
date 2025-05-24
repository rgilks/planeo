import { z } from "zod";

import { EyeUpdateType, EventType, Vec3Schema } from "@/domain";

export type Vec3 = z.infer<typeof Vec3Schema>;

type Writer = { write: (data: string) => void; closed: boolean };

const eyes = new Map<string, EyeUpdateType>();
const subs = new Set<Writer>();

export const setEye = (id: string, p: Vec3): void => {
  const msg: EyeUpdateType = { type: "eyeUpdate", id, p, t: Date.now() };
  eyes.set(id, msg);
  broadcast(msg);
};

export const broadcast = (msg: EventType): void => {
  const data = `data:${JSON.stringify(msg)}

`;
  for (const w of subs) {
    if (w.closed) {
      subs.delete(w);
      continue;
    }
    try {
      w.write(data);
    } catch (error) {
      console.error(
        `Failed to write to SSE subscriber for event type ${msg?.type ?? "unknown"}. Removing subscriber.`,
        error,
      );
      subs.delete(w);
    }
  }
};

export const subscribe = (w: Writer): void => {
  subs.add(w);
  for (const eye of eyes.values()) {
    try {
      w.write(`data:${JSON.stringify(eye)}

`);
    } catch (error) {
      console.error(
        `Failed to write initial eye data to SSE subscriber. Removing subscriber.`,
        error,
      );
      subs.delete(w);
      break;
    }
  }
};

export const purgeStale = (maxAge = 30000): void => {
  const now = Date.now();
  for (const [id, eye] of eyes) {
    if (now - eye.t > maxAge) eyes.delete(id);
  }
};

export const unsubscribe = (w: Writer): void => {
  subs.delete(w);
};

const PURGE_INTERVAL = 10000;
setInterval(() => {
  purgeStale();
}, PURGE_INTERVAL);
