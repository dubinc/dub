import { z } from "zod/v4";

export const VERIFICATION_TOKEN_CONFIG = {
  // Email change token
  emailChange: {
    prefix: "email-change:",
    expiresIn: 15 * 60 * 1000, // 15 minutes
    valueSchema: z.object({
      ownerId: z.string().min(1),
      email: z.email(),
      newEmail: z.email(),
      isPartnerProfile: z.boolean().optional(),
      syncIdentity: z.boolean().optional(),
      partnerId: z.string().optional(),
      redirectTo: z.enum(["/profile", "/account/settings"]).optional(),
    }),
  },

  // Admin impersonation token
  adminImpersonation: {
    prefix: "admin-impersonation:",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      email: z.string().trim().min(1),
      isAdminImpersonation: z.boolean(),
    }),
  },

  // Invite token
  invite: {
    prefix: "",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      email: z.email(),
      isInvite: z.boolean(),
    }),
  },

  // Legacy magic link token
  magicLink: {
    prefix: "",
    expiresIn: 5 * 60 * 1000, // 5 minutes
    valueSchema: z.object({
      email: z.email(),
    }),
  },
} as const;

export type VerificationTokenKind = keyof typeof VERIFICATION_TOKEN_CONFIG;

export function getVerificationTokenConfig<T extends VerificationTokenKind>(
  type: T,
): (typeof VERIFICATION_TOKEN_CONFIG)[T] {
  return VERIFICATION_TOKEN_CONFIG[type];
}
