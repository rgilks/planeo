import { z } from "zod";

import { BoxEventSchema, BoxUpdatePayloadSchema } from "./box";
import { Vec3Schema } from "./common";
import { MessageSchema } from "./message";

export const EyeUpdateSchema = z.object({
  type: z.literal("eyeUpdate"),
  id: z.string().min(1),
  name: z.string().optional(),
  p: Vec3Schema.optional(),
  l: Vec3Schema.optional(),
  t: z.number(),
});
export type EyeUpdateType = z.infer<typeof EyeUpdateSchema>;

export const ChatMessageEventSchema = MessageSchema.extend({
  type: z.literal("chatMessage"),
});
export type ChatMessageEventType = z.infer<typeof ChatMessageEventSchema>;

export const AiVisionEventSchema = z.object({
  type: z.literal("aiVision"),
  userId: z.string().min(1),
  timestamp: z.number(),
  imageDataUrl: z.string().url().startsWith("data:image/png;base64,"),
  chatHistory: z.array(MessageSchema),
});
export type AiVisionEventType = z.infer<typeof AiVisionEventSchema>;

export const EventSchema = z.discriminatedUnion("type", [
  EyeUpdateSchema,
  ChatMessageEventSchema,
  AiVisionEventSchema,
  BoxEventSchema,
  BoxUpdatePayloadSchema,
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
