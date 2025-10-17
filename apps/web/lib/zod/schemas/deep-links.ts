import z from "@/lib/zod";

export const deepViewDataSchema = z
  .object({
    ios: z.any(),
    android: z.any(),
  })
  .nullish();
