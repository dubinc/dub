import * as z from "zod/v4";

export const deepViewDataSchema = z
  .object({
    hidePoweredByBadge: z.boolean().optional(),
    appName: z.string().trim().min(1).optional(),
    variant: z.enum(["default", "minimal"]).default("default"),
    buttonClassnames: z.string().trim().min(1).optional(),
  })
  .nullish();
