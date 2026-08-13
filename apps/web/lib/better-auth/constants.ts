import { TWO_WEEKS_IN_SECONDS } from "@dub/utils";
import { z } from "zod/v4";

export const VERIFICATION_TOKEN_CONFIG = {
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
} as const;

export type VerificationTokenKind = keyof typeof VERIFICATION_TOKEN_CONFIG;
