import * as z from "zod/v4";

const deepViewDataObjectSchema = z.object({
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
});

export const deepViewDataSchema = z.preprocess(
  (val) => (val == null ? {} : val),
  deepViewDataObjectSchema,
);

export type DeepViewData = z.infer<typeof deepViewDataObjectSchema>;

export const parseDeepViewData = (data: unknown): DeepViewData => {
  const result = deepViewDataSchema.safeParse(data);
  return result.success ? result.data : { variant: "default" };
};
