import { GOOGLE_FAVICON_URL, R2_URL } from "@dub/utils";
import { fileTypeFromBuffer } from "file-type";
import * as z from "zod/v4";

/** Raster data-URL prefix for link preview images (base64ImageSchema, preprocess, metatags). */
export const linkPreviewImageBase64PrefixRegex =
  /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i;

const allowedImageTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

// Base64 encoded image
export const base64ImageSchema = z
  .string()
  .trim()
  .regex(linkPreviewImageBase64PrefixRegex, {
    message: "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
  })
  .refine(
    async (str) => {
      const base64Data = str.split(",")[1];

      if (!base64Data) {
        return false;
      }

      try {
        const buffer = new Uint8Array(Buffer.from(base64Data, "base64"));
        const fileType = await fileTypeFromBuffer(buffer);

        return fileType && allowedImageTypes.includes(fileType.mime);
      } catch (e) {
        return false;
      }
    },
    {
      message: "Invalid image format, supports only png, jpeg, jpg, gif, webp.",
    },
  )
  .transform((v) => v || null);

export const storedR2ImageUrlSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith(R2_URL), {
    message: `URL must start with ${R2_URL}`,
  });

// Google user content URL schema - supports URLs like https://lh3.googleusercontent.com/...
// This is needed when users sign up via Google OAuth and want to use their Google profile image
// as their workspace logo or avatar
export const googleUserContentUrlSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith("https://lh3.googleusercontent.com/"), {
    message: "Image URL must be a valid Google user content URL",
  });

// Google favicon URL schema - supports URLs starting with GOOGLE_FAVICON_URL
export const googleFaviconUrlSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith(GOOGLE_FAVICON_URL), {
    message: `Image URL must start with ${GOOGLE_FAVICON_URL}`,
  });

// Uploaded image could be any of the following:
// - Base64 encoded image
// - R2_URL
// - Special case for GOOGLE_FAVICON_URL
// - Google user content URLs (e.g., https://lh3.googleusercontent.com/...)
// This schema contains an async refinement check for base64 image validation,
// which requires using parseAsync() instead of parse() when validating
export const uploadedImageSchema = z
  .union([base64ImageSchema, storedR2ImageUrlSchema, googleFaviconUrlSchema])
  .transform((v) => v || null);

export const publicHostedImageSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "Image URL must start with http:// or https://",
  });

/** Coerce unusable preview strings (e.g. data:favicons) to null before create/update link validation. */
export function preprocessLinkPreviewImage(
  val: unknown,
): string | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === "" || typeof val !== "string") return null;
  const s = val.trim();
  if (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    linkPreviewImageBase64PrefixRegex.test(s)
  )
    return s;
  return null;
}
