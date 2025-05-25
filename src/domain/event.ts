import { z } from "zod";

import { MessageSchema } from "./message";

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const SymbolEventSchema = z.object({
  type: z.literal("symbol"),
  id: z.string(),
  key: z.string().min(1),
});
export type SymbolEventType = z.infer<typeof SymbolEventSchema>;

// This is the schema for an eye update event, used in the discriminated union
export const EyeUpdateSchema = z.object({
  type: z.literal("eyeUpdate"),
  id: z.string().min(1),
  p: Vec3Schema.optional(),
  l: Vec3Schema.optional(),
  t: z.number(),
});
export type EyeUpdateType = z.infer<typeof EyeUpdateSchema>; // This is EventEyeUpdateType

// Schema for chat messages broadcast over EventSource
export const ChatMessageEventSchema = MessageSchema.extend({
  type: z.literal("chatMessage"),
});
export type ChatMessageEventType = z.infer<typeof ChatMessageEventSchema>;

// General Event Schema using the base EyeUpdateSchema
export const EventSchema = z.discriminatedUnion("type", [
  SymbolEventSchema,
  EyeUpdateSchema,
  ChatMessageEventSchema,
]);
export type EventType = z.infer<typeof EventSchema>;

// Refined schema for API input validation - not exported from index.ts by default for EventType
export const ValidatedEyeUpdatePayloadSchema = EyeUpdateSchema.refine(
  (data) => data.p !== undefined || data.l !== undefined,
  {
    message:
      "Eye update must contain either 'p' (position) or 'l' (lookAt) or both.",
  },
);
export type ValidatedEyeUpdatePayloadType = z.infer<
  typeof ValidatedEyeUpdatePayloadSchema
>;
