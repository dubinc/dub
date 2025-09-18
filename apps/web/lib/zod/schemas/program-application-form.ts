import { z } from "zod";

export const programApplicationFormSchema = z.object({
  label: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
});
