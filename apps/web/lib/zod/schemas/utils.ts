import z from "@/lib/zod";
import { getUrlFromString, isValidUrl, parseDateTime } from "@dub/utils";
import { ZodIssueCode } from "zod";

export const parseUrlSchema = z
  .string()
  .transform((v) => getUrlFromString(v))
  .refine((v) => isValidUrl(v), { message: "Invalid URL" });

export const parseUrlSchemaAllowEmpty = ({
  maxLength,
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
      message: `Must be ${maxLength} or fewer characters long`,
    });
  }

  return schema.transform((v) => getUrlFromString(v));
};

export const parseDateSchema = z
  .string()
  .transform((v) => parseDateTime(v))
  .refine((v) => !!v, { message: "Invalid date" });

export const parseJsonSchema = (value: any, ctx: z.RefinementCtx) => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (e) {
      ctx.addIssue({
        code: ZodIssueCode.custom,
        message: (e as Error).message,
      });
    }
  }

  return value;
};
