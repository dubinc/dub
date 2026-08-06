import { passwordSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import PasswordUpdated from "@dub/email/templates/password-updated";
import { waitUntil } from "@vercel/functions";
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";
import { isSamlEnforcedForEmailDomain } from "../api/workspaces/is-saml-enforced-for-email-domain";
import { getActionVerificationPrefixes } from "./utils";

export const hooks = {
  // Runs before the request is processed
  before: createAuthMiddleware(async (ctx) => {
    const { path, body } = ctx;

    // Reject non-login Verification kinds on magic-link verify (e.g. email-change:)
    if (path === "/magic-link/verify") {
      const token = ctx.query?.token;
      if (typeof token === "string") {
        const blocked = getActionVerificationPrefixes().some((prefix) =>
          token.startsWith(prefix),
        );

        if (blocked) {
          throw new APIError("UNAUTHORIZED", {
            code: "INVALID_TOKEN",
            message: "Invalid token",
          });
        }
      }
    }

    if (["/change-password", "/reset-password"].includes(path)) {
      const newPassword = body?.newPassword;
      if (!newPassword) {
        return;
      }

      const { success, error } = passwordSchema.safeParse(newPassword);

      if (!success) {
        throw new APIError("BAD_REQUEST", {
          code: "PASSWORD_REQUIREMENTS_NOT_MET",
          message:
            error.issues[0]?.message ??
            "Password does not meet the requirements.",
        });
      }
    }

    if (["/sign-in/email", "/sign-in/magic-link"].includes(path)) {
      const email = body?.email;
      if (!email) {
        return;
      }

      if (await isSamlEnforcedForEmailDomain(email)) {
        throw new APIError("FORBIDDEN", {
          code: "REQUIRE_SAML_SSO",
          message: "SAML SSO is required for this email address.",
        });
      }
    }
  }),

  // Runs after the request is processed
  after: createAuthMiddleware(async (ctx) => {
    if (isAPIError(ctx.context.returned)) {
      return;
    }

    const { path, context } = ctx;
    const email = context.session?.user?.email;

    if (!email) {
      return;
    }

    if (path === "/change-password") {
      waitUntil(
        sendEmail({
          subject: "Your Dub account password has been updated",
          to: email,
          react: PasswordUpdated({
            email,
          }),
        }),
      );
    }
  }),
} satisfies BetterAuthOptions["hooks"];
