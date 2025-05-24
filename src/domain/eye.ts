import { Vector3, ShaderMaterial } from "three";
import { z } from "zod";

export const EyeStatusSchema = z.enum(["appearing", "visible", "disappearing"]);
export type EyeStatus = z.infer<typeof EyeStatusSchema>;

export const EyeStateSchema = z.object({
  id: z.string(),
  position: z.instanceof(Vector3),
  targetPosition: z.instanceof(Vector3),
  opacity: z.number(),
  scale: z.number(),
  status: EyeStatusSchema,
  material: z.instanceof(ShaderMaterial),
});
export type EyeState = z.infer<typeof EyeStateSchema>;

export const INITIAL_SCALE = 0.01;
export const TARGET_SCALE = 1.0;
export const FADE_DURATION = 1.0;
