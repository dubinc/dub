import {
  isValidDomain,
  isValidDomainFormat,
} from "@/lib/api/domains/is-valid-domain";
import { DubApiError } from "@/lib/api/errors";
import z from "@/lib/zod";

export const EmailDomainSchema = z.object({
  id: z.string(),
  slug: z.string(),
  fromAddress: z.string(),
  verified: z.boolean(),
  resendDomainId: z.string().nullable(),
  lastChecked: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const ResendDomainRecordSchema = z.object({
  record: z.string(),
  name: z.string(),
  type: z.string(),
  ttl: z.string(),
  value: z.string(),
  priority: z.number().optional(),
  status: z.enum([
    "not_started",
    "pending",
    "verified",
    "failed",
    "temporary_failure",
  ]),
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
  fromAddress: z
    .string({ required_error: "From address is required" })
    .email({ message: "Invalid from address" })
    .min(5, "From address is too short")
    .max(255, "From address is too long")
    .transform((value) => value.toLowerCase()),
});

export const updateEmailDomainBodySchema =
  createEmailDomainBodySchema.partial();

export const validateEmailDomain = ({
  slug,
  fromAddress,
}: z.infer<typeof createEmailDomainBodySchema>) => {
  if (fromAddress && !fromAddress.endsWith(slug)) {
    throw new DubApiError({
      code: "bad_request",
      message: "From address must end with the email domain.",
    });
  }
};

// resend email domain records
