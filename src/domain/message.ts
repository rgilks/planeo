import { z } from "zod";

export const MessageSchema = z.object({
  id: z.string().uuid(),
  userId: z.string(), // Or a more specific user ID schema if you have one
  name: z.string().optional(),
  text: z.string().min(1),
  timestamp: z.number(), // Unix timestamp
  audioSrc: z.string().optional(),
});

export type Message = z.infer<typeof MessageSchema>;
