import { plans, roles } from "@/lib/types";
import z from "@/lib/zod";

export const RECURRING_MAX_DURATIONS = [0, 3, 6, 12, 18, 24];

export const planSchema = z.enum(plans).describe("The plan of the workspace.");

export const roleSchema = z
  .enum(roles)
  .describe("The role of the authenticated user in the workspace.");

// A boolean query schema that coerces the value to a boolean
export const booleanQuerySchema = z
  .enum(["true", "false"])
  .transform((value) => value == "true")
  .openapi({
    type: "boolean",
  });

// Pagination
export const getPaginationQuerySchema = ({ pageSize }: { pageSize: number }) =>
  z.object({
    page: z.coerce
      .number({ invalid_type_error: "Page must be a number." })
      .positive({ message: "Page must be greater than 0." })
      .optional()
      .default(1)
      .describe("The page number for pagination.")
      .openapi({
        example: 1,
      }),
    pageSize: z.coerce
      .number({ invalid_type_error: "Page size must be a number." })
      .positive({ message: "Page size must be greater than 0." })
      .max(pageSize, {
        message: `Max page size is ${pageSize}.`,
      })
      .optional()
      .default(pageSize)
      .describe("The number of items per page.")
      .openapi({
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
  .regex(/^data:image\/(png|jpeg|jpg|gif|webp);base64,/, {
    message:
      "Invalid image format. Must be a base64 encoded image with valid image type (png, jpeg, jpg, gif, webp).",
  })
  .refine(
    (str) => {
      const base64Data = str.split(",")[1];

      if (!base64Data) {
        return false;
      }

      return /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        base64Data,
      );
    },
    {
      message:
        "Invalid base64 content. The image data is not properly base64 encoded.",
    },
  )
  .transform((v) => v || null);

// Base64 encoded image or dubassets.com URL
export const uploadedImageSchema = z
  .union([
    base64ImageSchema,
    z
      .string()
      .url()
      .refine((url) => url.startsWith("https://dubassets.com"), {
        message: "URL must start with https://dubassets.com",
      }),
  ])
  .transform((v) => v || null);
