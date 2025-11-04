import {
  isValidDomain,
  isValidDomainFormat,
} from "@/lib/api/domains/is-valid-domain";
import z from "@/lib/zod";
import { EmailDomainStatus } from "@dub/prisma/client";

export const EmailDomainSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: z.nativeEnum(EmailDomainStatus),
  resendDomainId: z.string().nullable(),
  lastChecked: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createEmailDomainBodySchema = z.object({
  slug: z
    .string({ required_error: "Email domain is required" })
    .min(5, "Email domain is too short")
    .max(50, "Email domain is too long")
    .refine(isValidDomainFormat, { message: "Please use a valid domain name." })
    .refine(isValidDomain, {
      message: "You are not allowed to use this domain name",
    })
    .transform((value) => value.toLowerCase()),
});

export const updateEmailDomainBodySchema =
  createEmailDomainBodySchema.partial();
