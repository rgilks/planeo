import { z } from "zod";

const envSchema = z.object({
  TOTAL_AGENTS: z.preprocess((val) => {
    const parsed = parseInt(String(val), 10);
    // If process.env.TOTAL_AGENTS is undefined (client-side, not NEXT_PUBLIC_),\n      // parseInt(String(undefined)) is NaN. Default to 0 in such cases.\n      // Server-side, it should be a valid number string from .env.local.
    return isNaN(parsed) ? 0 : parsed;
  }, z.number().min(0)),
  // Add other environment variables here as needed
});

export const env = envSchema.parse(process.env);
