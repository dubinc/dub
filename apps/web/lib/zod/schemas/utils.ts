import { getUrlFromString, isValidUrl, parseDateTime } from "@dub/utils";
import * as z from "zod/v4";

// This is the default max length for URL validation
export const DESTINATION_URL_MAX_LENGTH = 32000;

const coerceToNumber = (n: unknown) =>
  typeof n === "bigint" || typeof n === "string" ? Number(n) : n;

/** Accepts number (before migration) or bigint (after), outputs number. */
export const centsSchema = z.preprocess(coerceToNumber, z.number());

/** Same as centsSchema but with a default of 0. The default is on the inner z.number()
 *  so code generators (e.g. Speakeasy) can introspect it through the preprocess layer. */
export const centsSchemaWithDefault = z.preprocess(
  coerceToNumber,
  z.number().default(0),
);

/** Accepts number or bigint or null (e.g. from Prisma BigInt?), outputs number | null. */
export const nullableCountSchema = z.preprocess(
  coerceToNumber,
  z.number().nullable(),
);

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

// Coerce a JSON string to an object before Zod validation.
// Callers sending metadata as a pre-stringified JSON string would otherwise fail `z.record()`
const coerceJsonString = (val: unknown) => {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// Metadata field: accepts an object or a JSON string, max 10 000 chars.
export const metadataSchema = z.preprocess(
  coerceJsonString,
  z
    .record(z.string(), z.any())
    .nullish()
    .default(null)
    .refine((val) => !val || JSON.stringify(val).length <= 10000, {
      message: "Metadata must be less than 10,000 characters when stringified",
    })
    .describe(
      "Additional metadata to be stored with the event. Max 10,000 characters when stringified.",
    ),
);

export const parseDateSchema = z
  .string()
  .transform((v) => parseDateTime(v))
  .refine((v) => !!v, { message: "Invalid date" });
