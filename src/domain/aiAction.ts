import { z } from "zod";

// Define Zod schemas for the action part of the LLM response
const MoveActionSchema = z.object({
  type: z.literal("move"),
  direction: z.enum(["forward", "backward"]),
  distance: z.number().positive(),
});

const TurnActionSchema = z.object({
  type: z.literal("turn"),
  direction: z.enum(["left", "right"]),
  degrees: z.number().min(1).max(30),
});

const NoActionSchema = z.object({
  type: z.literal("none"),
});

export const AIActionSchema = z.union([
  MoveActionSchema,
  TurnActionSchema,
  NoActionSchema,
  z.null(), // Allow null for no action
]);

export type AIAction = z.infer<typeof AIActionSchema>;

// Define the expected JSON structure from the LLM
export const AIResponseSchema = z.object({
  chatMessage: z.string().optional(),
  action: AIActionSchema,
});

export type ParsedAIResponse = z.infer<typeof AIResponseSchema>;
