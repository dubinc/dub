import * as z from "zod/v4";

export const segmentCredentialsSchema = z.object({
  writeKey: z.string().min(1).max(255),
});
