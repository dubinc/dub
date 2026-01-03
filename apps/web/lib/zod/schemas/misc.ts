import { plans } from "@/lib/types";
import { WorkspaceRole } from "@dub/prisma/client";
import { GOOGLE_FAVICON_URL, R2_URL } from "@dub/utils";
import { fileTypeFromBuffer } from "file-type";
import * as z from "zod/v4";

export const RECURRING_MAX_DURATIONS = [0, 1, 3, 6, 12, 18, 24, 36, 48];

export const planSchema = z.enum(plans).describe("The plan of the workspace.");

export const roleSchema = z
  .enum(WorkspaceRole)
  .describe("The role of the authenticated user in the workspace.");

const allowedImageTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/gif",
  "image/webp",
];

export const booleanQuerySchema = z
  .stringbool({
    truthy: ["true"],
    falsy: ["false"],
  })
  .meta({
    type: "boolean",
  });

// Pagination
export const getPaginationQuerySchema = ({
  pageSize,
}: {
  pageSize: number;
}) => ({
  page: z.coerce
    .number({ error: "Page must be a number." })
    .positive({ message: "Page must be greater than 0." })
    .optional()
    .default(1)
    .describe("The page number for pagination.")
    .meta({
      example: 1,
    }),
  pageSize: z.coerce
    .number({ error: "Page size must be a number." })
    .positive({ message: "Page size must be greater than 0." })
    .max(pageSize, {
      message: `Max page size is ${pageSize}.`,
    })
    .optional()
    .default(pageSize)
    .describe("The number of items per page.")
    .meta({
      example: 50,
    }),
});

export const maxDurationSchema = z.coerce
  .number()
  .refine((val) => RECURRING_MAX_DURATIONS.includes(val), {
    message: `Max duration must be ${RECURRING_MAX_DURATIONS.join(", ")}`,
  })
  .nullish();

// Base64 encoded image
export const base64ImageSchema = z
  .string()
  .trim()
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
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

// Base64 encoded raster image or SVG
export const base64ImageAllowSVGSchema = z
  .string()
  .trim()
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,/, {
    message:
      "Invalid image format, supports only png, jpeg, jpg, gif, webp, svg.",
  })
  .transform((v) => v || null);

export const storedR2ImageUrlSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith(R2_URL), {
    message: `URL must start with ${R2_URL}`,
  });

// Uploaded image could be any of the following:
// - Base64 encoded image
// - R2_URL
// - Special case for GOOGLE_FAVICON_URL
// This schema contains an async refinement check for base64 image validation,
// which requires using parseAsync() instead of parse() when validating
export const uploadedImageSchema = z
  .union([
    base64ImageSchema,
    storedR2ImageUrlSchema,
    z
      .url()
      .trim()
      .refine((url) => url.startsWith(GOOGLE_FAVICON_URL), {
        message: `Image URL must start with ${GOOGLE_FAVICON_URL}`,
      }),
  ])
  .transform((v) => v || null);

// Base64 encoded image/SVG or R2_URL
// This schema contains an async refinement check for base64 image validation,
// which requires using parseAsync() instead of parse() when validating
export const uploadedImageAllowSVGSchema = z
  .union([base64ImageAllowSVGSchema, storedR2ImageUrlSchema])
  .transform((v) => v || null);

export const publicHostedImageSchema = z
  .url()
  .trim()
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "Image URL must start with http:// or https://",
  });
