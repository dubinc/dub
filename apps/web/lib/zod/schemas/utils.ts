import z from "@/lib/zod";
import { getUrlFromString, isValidUrl, parseDateTime } from "@dub/utils";

export const parseUrlSchema = z
  .string()
  .transform((v) => getUrlFromString(v))
  .refine((v) => isValidUrl(v), { message: "Invalid URL" });

export const parseUrlSchemaAllowEmpty = z
  .string()
  .transform((v) => getUrlFromString(v));

export const parseDateSchema = z
  .string()
  .transform((v) => parseDateTime(v))
  .refine((v) => !!v, { message: "Invalid date" });
