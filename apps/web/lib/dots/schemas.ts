import z from "../zod";

export const dotsAppSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.string(),
});
