import {
  type EventEyeUpdateType,
  type EventType,
  type Vec3,
  type BoxEventType,
} from "@/domain";
import { env } from "@/lib/env";

type Writer = { write: (data: string) => void; closed: boolean };

const eyes = new Map<string, EventEyeUpdateType>();
const boxes = new Map<string, BoxEventType>();
const subs = new Set<Writer>();

let boxesInitialized = false;

const BOX_COLORS = [
  "#FF0000",
  "#00FF00",
  "#0000FF",
  "#FFFF00",
  "#FF00FF",
  "#00FFFF",
  "#FFA500",
  "#FF69B4",
  "#39FF14",
  "#7D05EF",
  "#FDFD33",
  "#FF7F00",
];

const initializeBoxes = () => {
  if (boxesInitialized || env.NUMBER_OF_BOXES === 0) {
    if (boxesInitialized) console.log("[SSE Store] Boxes already initialized.");
    return;
  }

  console.log(
    `[SSE Store] Initializing ${env.NUMBER_OF_BOXES} boxes (NUMBER_OF_BOXES: ${env.NUMBER_OF_BOXES}).`,
  );
  for (let i = 0; i < env.NUMBER_OF_BOXES; i++) {
    const boxId = `box_${i + 1}`;
    const position: Vec3 = [i * 15 - (env.NUMBER_OF_BOXES - 1) * 7.5, 5, -20];
    const orientation: Vec3 = [0, 0, 0];
    const color = BOX_COLORS[i % BOX_COLORS.length];

    const boxData: BoxEventType = {
      type: "box",
      id: boxId,
      p: position,
      o: orientation,
      c: color,
      t: Date.now(),
    };
    boxes.set(boxId, boxData);
    console.log(`[SSE Store] Initialized box: ${JSON.stringify(boxData)}`);
  }
  console.log(
    `[SSE Store] Successfully initialized ${boxes.size} of ${env.NUMBER_OF_BOXES} boxes.`,
  );
  boxesInitialized = true;
};

initializeBoxes();

export const setEye = (
  id: string,
  p: Vec3 | undefined,
  l: Vec3 | undefined,
  name?: string,
): void => {
  const existingEye = eyes.get(id);
  const now = Date.now();

  let newP = p;
  let newL = l;
  let newName = name;

  if (newP === undefined && existingEye?.p) {
    newP = existingEye.p;
  }
  if (newL === undefined && existingEye?.l) {
    newL = existingEye.l;
  }
  if (newName === undefined && existingEye?.name) {
    newName = existingEye.name;
  }

  if (newP === undefined) {
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
  if (newName) {
    msg.name = newName;
  }

  eyes.set(id, msg);
  broadcast(msg);
};

export const getEyes = (): Map<string, EventEyeUpdateType> => {
  return eyes;
};

export const setBox = (
  id: string,
  p: Vec3 | undefined,
  o: Vec3 | undefined,
): void => {
  const existingBox = boxes.get(id);
  const now = Date.now();

  let newP = p;
  let newO = o;

  if (newP === undefined && existingBox?.p) {
    newP = existingBox.p;
  }
  if (newO === undefined && existingBox?.o) {
    newO = existingBox.o;
  }

  if (newP === undefined || newO === undefined || !existingBox?.c) {
    return;
  }

  const msg: BoxEventType = {
    type: "box",
    id,
    p: newP,
    o: newO,
    c: existingBox.c,
    t: now,
  };

  boxes.set(id, msg);
  broadcast(msg);
};

export const getBoxes = (): Map<string, BoxEventType> => {
  return boxes;
};

export const broadcast = (msg: EventType): void => {
  if (!msg) {
    console.warn(
      "[SSE Store] Broadcast called with null or undefined message. Skipping.",
    );
    return;
  }
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
  if (!boxesInitialized) {
    console.log(
      "[SSE Store] Boxes not yet initialized during subscribe. Initializing now.",
    );
    initializeBoxes();
  }

  subs.add(w);
  console.log("[SSE Store] New subscriber. Total subscribers:", subs.size);
  console.log("[SSE Store] Sending initial states to new subscriber...");

  let eyesSent = 0;
  for (const eye of eyes.values()) {
    try {
      const eyeDataString = `data:${JSON.stringify(eye)}\n\n`;
      w.write(eyeDataString);
      eyesSent++;
    } catch (error) {
      console.error(
        `Failed to write initial eye data to SSE subscriber. Removing subscriber.`,
        error,
      );
      subs.delete(w);
      break;
    }
  }
  console.log(
    `[SSE Store] Sent ${eyesSent} initial eye states to new subscriber.`,
  );

  let boxesSent = 0;
  if (boxes.size === 0) {
    console.log("[SSE Store] No boxes to send to new subscriber.");
  }
  for (const box of boxes.values()) {
    try {
      const boxDataString = `data:${JSON.stringify(box)}\n\n`;
      w.write(boxDataString);
      boxesSent++;
    } catch (error) {
      console.error(
        `Failed to write initial box data to SSE subscriber. Removing subscriber.`,
        error,
      );
      subs.delete(w);
      break;
    }
  }
  console.log(
    `[SSE Store] Sent ${boxesSent} initial box states to new subscriber.`,
  );
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
