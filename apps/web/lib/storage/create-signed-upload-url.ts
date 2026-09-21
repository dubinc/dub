import { storage } from "@/lib/storage";
import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { signedUploadInputSchema } from "./schemas";

export async function createSignedUploadUrl({
  key,
  contentLength,
  contentType,
  bucket = "public",
}: z.infer<typeof signedUploadInputSchema> & {
  key: string;
  bucket?: "public" | "private";
}) {
  const signedUrl = await storage.getSignedUploadUrl({
    key,
    bucket,
    contentLength,
    contentType,
  });

  return {
    key,
    signedUrl,
    destinationUrl: `${R2_URL}/${key}`,
  };
}
