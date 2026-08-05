import { passwordSchema } from "@/lib/zod/schemas/auth";
import { sendEmail } from "@dub/email";
import PasswordUpdated from "@dub/email/templates/password-updated";
import { waitUntil } from "@vercel/functions";
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, isAPIError } from "better-auth/api";

// async function enforceSignInGuards(email: string, path: string) {
//   const isLinkSend = path === "/sign-in/magic-link";

//   try {
//     await assertRateLimit({
//       policy: isLinkSend
//         ? RATELIMIT_POLICIES.loginLinkSend
//         : RATELIMIT_POLICIES.login,
//       identifier: email,
//     });
//   } catch (error) {
//     await throwRateLimitAsApiError(error);
//   }

//   if (await isSamlEnforcedForEmailDomain(email)) {
//     throw new APIError("FORBIDDEN", {
//       message: "require-saml-sso",
//     });
//   }
// }

export const hooks = {
  before: createAuthMiddleware(async (ctx) => {
    console.log("createAuthMiddleware before", {
      path: ctx.path,
      body: ctx.body,
    });

    // Change and reset password endpoints
    if (ctx.path === "/change-password" || ctx.path === "/reset-password") {
      const newPassword = ctx.body?.newPassword;
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

    // if (SIGN_IN_PATHS.has(ctx.path)) {
    //   const email =
    //     typeof ctx.body?.email === "string" ? ctx.body.email : undefined;

    //   if (!email) {
    //     return;
    //   }

    //   await enforceSignInGuards(email, ctx.path);
    //   return;
    // }
  }),

  after: createAuthMiddleware(async (ctx) => {
    if (ctx.path !== "/change-password") {
      return;
    }

    if (isAPIError(ctx.context.returned)) {
      return;
    }

    const email = ctx.context.session?.user?.email;

    if (!email) {
      return;
    }

    waitUntil(
      sendEmail({
        subject: "Your Dub account password has been updated",
        to: email,
        react: PasswordUpdated({
          email,
        }),
      }),
    );
  }),
} satisfies BetterAuthOptions["hooks"];
