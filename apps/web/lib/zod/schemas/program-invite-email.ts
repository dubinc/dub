import { z } from "zod";

export const programInviteEmailDataSchema = z
  .object({
    subject: z.string(),
    title: z.string(),
    body: z.string(),
  })
  .nullish();
