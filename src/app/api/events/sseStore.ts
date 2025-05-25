import { EventEyeUpdateType, EventType, type Vec3 } from "@/domain";

type Writer = { write: (data: string) => void; closed: boolean };

const eyes = new Map<string, EventEyeUpdateType>();
const subs = new Set<Writer>();

export const setEye = (
  id: string,
  p: Vec3 | undefined,
  l: Vec3 | undefined,
): void => {
  const existingEye = eyes.get(id);
  const now = Date.now();

  // Start with the new data, or undefined if not provided
  let newP = p;
  let newL = l;

  // If new data for p or l is undefined, try to use existing data
  if (newP === undefined && existingEye?.p) {
    newP = existingEye.p;
  }
  if (newL === undefined && existingEye?.l) {
    newL = existingEye.l;
  }

  // We must have at least a position to store/broadcast an eye
  if (newP === undefined) {
    // This case should ideally be prevented by the caller (route.ts)
    // by ensuring at least p or l is present in the incoming data,
    // and if only l is new, p must exist from a previous state.
    // However, if an eye is new and only 'l' is provided, we can't store it.
    console.warn(`setEye called for id ${id} without position data. Ignoring.`);
    return;
  }

  const msg: EventEyeUpdateType = {
    type: "eyeUpdate",
    id,
    t: now,
  };

  if (newP) {
    msg.p = newP;
  }
  if (newL) {
    msg.l = newL;
  }

  eyes.set(id, msg);
  broadcast(msg);
};

export const getEyes = (): Map<string, EventEyeUpdateType> => {
  return eyes;
};

export const broadcast = (msg: EventType): void => {
  const data = `data:${JSON.stringify(msg)}\n\n`;
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
      w.write(`data:${JSON.stringify(eye)}\n\n`);
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
