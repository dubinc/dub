import * as z from "zod/v4";

export const deepViewDataSchema = z
  .object({
    ios: z.any(),
    android: z.any(),
  })
  .nullish();
