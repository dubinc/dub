import z from "@/lib/zod";
import { getUrlFromString, isValidUrl, parseDateTime } from "@dub/utils";

// This is the default max length for URL validation
export const DESTINATION_URL_MAX_LENGTH = 32000;

export const parseUrlSchema = z
  .string()
  .max(DESTINATION_URL_MAX_LENGTH, {
    message: `Must be ${DESTINATION_URL_MAX_LENGTH} or fewer characters long.`,
  })
  .transform((v) => getUrlFromString(v))
  .refine((v) => isValidUrl(v), { message: "Invalid URL" });

export const parseUrlSchemaAllowEmpty = ({
  maxLength = DESTINATION_URL_MAX_LENGTH,
  trim = false,
}: {
  maxLength?: number;
  trim?: boolean;
} = {}) => {
  let schema = z.string();

  if (trim) {
    schema = schema.trim();
  }

  if (maxLength) {
    schema = schema.max(maxLength, {
      message: `Must be ${maxLength} or fewer characters long.`,
    });
  }

  return schema.transform((v) => getUrlFromString(v));
};

export const parseDateSchema = z
  .string()
  .transform((v) => parseDateTime(v))
  .refine((v) => !!v, { message: "Invalid date" });
