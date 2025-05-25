import { EventEyeUpdateType, EventType, type Vec3 } from "@/domain";
import { getAIAgents } from "@/domain/aiAgent";
import { EYE_Y_POSITION } from "@/domain/sceneConstants";

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

// AI Agent Movement Logic
const GRID_UNIT = 1;
const MIN_MOVE_UNITS = 5;
const MAX_MOVE_UNITS = 25;
const MIN_MOVE = MIN_MOVE_UNITS * GRID_UNIT;
const MAX_MOVE = MAX_MOVE_UNITS * GRID_UNIT;

const MOVEMENT_AREA_MIN_X = -250;
const MOVEMENT_AREA_MAX_X = 250;
const MOVEMENT_AREA_MIN_Z = -250;
const MOVEMENT_AREA_MAX_Z = 250;
const AI_MOVE_INTERVAL = 5000; // 5 seconds

const getRandomOffset = (min: number, max: number): number => {
  let offset = Math.random() * (max - min) + min;
  // Ensure offset is not too small (e.g., effectively zero)
  while (Math.abs(offset) < min) {
    offset = Math.random() * (max - min) + min;
  }
  return offset;
};

const updateAIAgentTargets = () => {
  const agents = getAIAgents();
  agents.forEach((agent) => {
    const currentEyeData = eyes.get(agent.id);
    if (!currentEyeData || !currentEyeData.p) {
      // Agent might not be initialized yet, or has no position data.
      // Initial position will be set by GET /api/events route.
      return;
    }

    const currentX = currentEyeData.p[0];
    const currentZ = currentEyeData.p[2];

    const randomMoveX =
      getRandomOffset(MIN_MOVE, MAX_MOVE) * (Math.random() < 0.5 ? 1 : -1);
    const randomMoveZ =
      getRandomOffset(MIN_MOVE, MAX_MOVE) * (Math.random() < 0.5 ? 1 : -1);

    let newX = currentX + randomMoveX;
    let newZ = currentZ + randomMoveZ;

    // Clamp to boundaries
    newX = Math.max(MOVEMENT_AREA_MIN_X, Math.min(MOVEMENT_AREA_MAX_X, newX));
    newZ = Math.max(MOVEMENT_AREA_MIN_Z, Math.min(MOVEMENT_AREA_MAX_Z, newZ));

    // Ensure there's actual movement after clamping
    if (newX === currentX && newZ === currentZ) {
      // If clamped to the same position, try a different direction next time or slightly adjust.
      // For now, we just skip this update if no effective move.
      // A more robust solution might re-calculate or nudge.
      return;
    }

    const newPosition: Vec3 = [newX, EYE_Y_POSITION, newZ];

    // Refined look-at logic
    const lookAheadDistance = MAX_MOVE_UNITS * GRID_UNIT * 0.5;
    let newLookAtVec: Vec3;

    const actualOffsetX = newX - currentX;
    const actualOffsetZ = newZ - currentZ;

    if (Math.abs(actualOffsetX) < 0.01 && Math.abs(actualOffsetZ) < 0.01) {
      // Minimal or no actual movement, try to preserve current lookAt orientation
      // relative to the new (almost same) position.
      if (currentEyeData.l && currentEyeData.p) {
        const prevLookAtTarget = currentEyeData.l;
        const prevTargetPos = currentEyeData.p;

        const lookAtRelX = prevLookAtTarget[0] - prevTargetPos[0];
        // const lookAtRelY = prevLookAtTarget[1] - prevTargetPos[1]; // Y is constant
        const lookAtRelZ = prevLookAtTarget[2] - prevTargetPos[2];

        newLookAtVec = [newX + lookAtRelX, EYE_Y_POSITION, newZ + lookAtRelZ];
      } else {
        // Default: look along negative Z axis from the new position (e.g. "forward" if z is depth)
        newLookAtVec = [newX, EYE_Y_POSITION, newZ - lookAheadDistance];
      }
    } else {
      // There is noticeable movement, calculate lookAt in direction of actual movement
      const length = Math.sqrt(
        actualOffsetX * actualOffsetX + actualOffsetZ * actualOffsetZ,
      );

      const normDirX = length > 0.001 ? actualOffsetX / length : 0;
      const normDirZ = length > 0.001 ? actualOffsetZ / length : 0;

      newLookAtVec = [
        newX + normDirX * lookAheadDistance,
        EYE_Y_POSITION,
        newZ + normDirZ * lookAheadDistance,
      ];
    }

    setEye(agent.id, newPosition, newLookAtVec);
  });
};

setInterval(updateAIAgentTargets, AI_MOVE_INTERVAL);
