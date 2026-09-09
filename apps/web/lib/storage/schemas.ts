import * as z from "zod/v4";

export const signedUploadInputSchema = z.object({
  contentType: z.string(),
  contentLength: z.number(),
});
