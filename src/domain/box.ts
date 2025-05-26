import { z } from "zod";

import { Vec3Schema } from "./common"; // Changed import path

export const BoxSchema = z.object({
  type: z.literal("box"),
  id: z.string().min(1),
  p: Vec3Schema, // Position
  o: Vec3Schema, // Orientation (as Euler angles or a quaternion represented as Vec3 for simplicity)
  c: z.string(), // Color (e.g., hex string like "#FF0000")
  t: z.number(), // Timestamp of last update
});
export type BoxType = z.infer<typeof BoxSchema>;

// Schema for the payload when a client sends a box update
export const BoxUpdatePayloadSchema = z.object({
  type: z.literal("boxUpdate"), // This will be the event type in the main EventSchema
  id: z.string().min(1),
  p: Vec3Schema.optional(),
  o: Vec3Schema.optional(),
  // 't' (timestamp) will be added by the server upon receiving/broadcasting
});
export type BoxUpdatePayloadType = z.infer<typeof BoxUpdatePayloadSchema>;

// Refine to ensure at least position or orientation is present
export const ValidatedBoxUpdatePayloadSchema = BoxUpdatePayloadSchema.refine(
  (data) => data.p !== undefined || data.o !== undefined,
  {
    message:
      "Box update must contain either 'p' (position) or 'o' (orientation) or both.",
  },
);
export type ValidatedBoxUpdatePayloadType = z.infer<
  typeof ValidatedBoxUpdatePayloadSchema
>;

// This will be the actual event type that gets broadcasted via SSE
export const BoxEventSchema = BoxSchema.extend({
  type: z.literal("box"), // Overriding to 'box' as it's the specific event type for a box state
});
export type BoxEventType = z.infer<typeof BoxEventSchema>;
