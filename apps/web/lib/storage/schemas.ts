import * as z from "zod/v4";

export const signedUploadInputSchema = z.object({
  contentType: z.string().trim().min(1),
  contentLength: z.number().int().positive(),
});
