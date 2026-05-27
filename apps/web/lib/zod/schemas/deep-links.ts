import * as z from "zod/v4";

export const deepViewDataSchema = z
  .object({
    hidePoweredByBadge: z.boolean().optional(),
    appName: z.string().trim().min(1).optional(),
    variant: z.enum(["default", "minimal"]).default("default"),
    buttonStyle: z
      .object({
        backgroundColor: z.string().trim().min(1).optional(),
        borderColor: z.string().trim().min(1).optional(),
        borderRadius: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .default({
    variant: "default",
  });
