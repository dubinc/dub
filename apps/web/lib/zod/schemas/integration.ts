import { R2_URL } from "@dub/utils";
import { z } from "zod";

export const integrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  readme: z.string().nullish(),
  developer: z.string(),
  website: z.string(),
  logo: z.string().nullish(),
  screenshots: z.array(z.string()).nullish(),
  installUrl: z.string().nullish(),
  verified: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
  installations: z.number().default(0),
});

export const createIntegrationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100),
  developer: z.string().min(1).max(100),
  website: z
    .string()
    .url({
      message: "website must be a valid URL",
    })
    .max(100),
  logo: z
    .string()
    .url({
      message: "Please provide a valid URL for the logo",
    })
    .nullish(),
  description: z
    .string()
    .max(120, {
      message: "must be less than 120 characters",
    })
    .nullish(),
  readme: z
    .string()
    .max(1000, {
      message: "must be less than 1000 characters",
    })
    .nullish(),
  screenshots: z
    .array(z.string())
    .max(4, {
      message: "only 4 screenshots are allowed",
    })
    .transform((screenshots) =>
      screenshots.map((screenshot) =>
        screenshot.startsWith(R2_URL) ? screenshot : `${R2_URL}/${screenshot}`,
      ),
    )
    .default([]),
});
