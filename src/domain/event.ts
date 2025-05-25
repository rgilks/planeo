import { z } from "zod";

import { MessageSchema } from "./message";

export const Vec3Schema = z.tuple([z.number(), z.number(), z.number()]);
export type Vec3 = z.infer<typeof Vec3Schema>;

export const EyeUpdateSchema = z.object({
  type: z.literal("eyeUpdate"),
  id: z.string().min(1),
  p: Vec3Schema.optional(),
  l: Vec3Schema.optional(),
  t: z.number(),
});
export type EyeUpdateType = z.infer<typeof EyeUpdateSchema>;

export const ChatMessageEventSchema = MessageSchema.extend({
  type: z.literal("chatMessage"),
});
export type ChatMessageEventType = z.infer<typeof ChatMessageEventSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  EyeUpdateSchema,
  ChatMessageEventSchema,
]);
export type EventType = z.infer<typeof EventSchema>;

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
