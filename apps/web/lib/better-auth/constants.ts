import { TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { z } from "zod/v4";

export const VERIFICATION_TOKEN_CONFIG = {
  // Email change token (action — must never create a session)
  emailChange: {
    purpose: "action",
    prefix: "email-change:",
    expiresIn: 15 * 60 * 1000, // 15 minutes
    valueSchema: z.object({
      ownerId: z.string().min(1),
      currentEmail: z.email(),
      newEmail: z.email(),
      isPartnerProfile: z.boolean().optional(),
      syncIdentity: z.boolean().optional(),
      partnerId: z.string().optional(),
      redirectTo: z.enum(["/profile", "/account/settings"]).optional(),
    }),
  },

  // Admin impersonation token (magic-link login)
  adminImpersonation: {
    purpose: "magicLinkLogin",
    prefix: "",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      email: z.email(),
      isAdminImpersonation: z.literal(true),
    }),
  },

  // Invite token (magic-link login)
  invite: {
    purpose: "magicLinkLogin",
    prefix: "",
    expiresIn: TWO_WEEKS_IN_SECONDS * 1000, // 2 weeks
    valueSchema: z.object({
      email: z.email(),
      isInvite: z.literal(true),
    }),
  },

  // Legacy magic link token
  magicLink: {
    purpose: "magicLinkLogin",
    prefix: "",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      email: z.email(),
    }),
  },

  // Signup email OTP (action — must never create a session)
  signupOtp: {
    purpose: "action",
    prefix: "signup:",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      targetEmail: z.email(),
      code: z.string().length(6),
    }),
  },

  // Partner account merge OTP (action — must never create a session)
  mergePartnerAccountsOtp: {
    purpose: "action",
    prefix: "merge-partner-accounts:",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      targetEmail: z.email(),
      code: z.string().length(6),
    }),
  },
} as const;

export type VerificationTokenKind = keyof typeof VERIFICATION_TOKEN_CONFIG;
