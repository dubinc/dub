import * as z from "zod/v4";

export const programInviteEmailDataSchema = z
  .object({
    subject: z.string(),
    title: z.string(),
    body: z.string(),
  })
  .nullish();
