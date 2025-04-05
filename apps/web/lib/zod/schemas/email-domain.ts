import z from "@/lib/zod";
import { validDomainRegex } from "@dub/utils";

export const EmailDomainSchema = z.object({
  id: z.string(),
  slug: z.string(),
  verified: z.boolean(),
  lastChecked: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createOrUpdateEmailDomainSchema = z.object({
  slug: z
    .string({ required_error: "domain is required." })
    .min(1, "domain cannot be empty.")
    .max(190, "domain cannot be longer than 190 characters.")
    .trim()
    .transform((domain) => domain.toLowerCase())
    .refine((domain) => validDomainRegex.test(domain), {
      message: "Invalid domain.",
    }),
});
