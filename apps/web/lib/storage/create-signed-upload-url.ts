import { DubApiError } from "@/lib/api/errors";
import { storage } from "@/lib/storage";
import { R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { signedUploadInputSchema } from "./schemas";
import { UPLOAD_POLICIES } from "./upload-policies";

export async function createSignedUploadUrl({
  key,
  policy,
  contentLength,
  contentType,
  bucket = "public",
}: z.infer<typeof signedUploadInputSchema> & {
  key: string;
  policy: keyof typeof UPLOAD_POLICIES;
  bucket?: "public" | "private";
}) {
  const uploadPolicy = UPLOAD_POLICIES[policy];

  if (!uploadPolicy) {
    throw new DubApiError({
      code: "bad_request",
      message: `Invalid policy: ${policy}`,
    });
  }

  const allowedContentTypes = uploadPolicy.contentTypes as readonly string[];

  if (!allowedContentTypes.includes(contentType)) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `Invalid content type. Must be one of: ${uploadPolicy.contentTypes.join(", ")}`,
    });
  }

  if (!Number.isInteger(contentLength) || contentLength <= 0) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "contentLength must be a positive integer.",
    });
  }

  if (contentLength > uploadPolicy.maxBytes) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: `File size exceeds the maximum allowed size of ${uploadPolicy.maxBytes / 1024 / 1024}MB`,
    });
  }

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
