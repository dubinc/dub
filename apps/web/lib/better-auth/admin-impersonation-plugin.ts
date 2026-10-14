import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";
import type { BetterAuthPlugin, GenericEndpointContext } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import {
  createVerificationToken,
  findVerificationToken,
} from "./verification-token";

const MAGIC_LINK_VERIFY_PATH = "/magic-link/verify";

export async function isAdminImpersonation({
  context,
  email,
}: {
  context: GenericEndpointContext | null;
  email: string;
}) {
  return (
    context?.path === MAGIC_LINK_VERIFY_PATH &&
    "adminImpersonationEmail" in context &&
    context.adminImpersonationEmail === email.toLowerCase()
  );
}

function buildVerifyUrl(origin: string, token: string, callbackURL: string) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export async function createImpersonationUrls(email: string) {
  const [{ token: appToken }, { token: partnersToken }] = await Promise.all([
    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),

    createVerificationToken({
      kind: "adminImpersonation",
      value: {
        email,
        isAdminImpersonation: true,
      },
    }),
  ]);

  return {
    app: buildVerifyUrl(APP_DOMAIN, appToken, APP_DOMAIN),
    partners: buildVerifyUrl(PARTNERS_DOMAIN, partnersToken, PARTNERS_DOMAIN),
  };
}

// Stash impersonation on the request context in /magic-link/verify before, not
// verification.delete.after. Better Auth queues *.after hooks until the whole
// handler finishes (including on throw), and magic-link consumes the token
// before createSession, so session.create.before cannot look the token up.
export const adminImpersonation = {
  id: "admin-impersonation",
  hooks: {
    before: [
      {
        matcher: (ctx) => ctx.path === MAGIC_LINK_VERIFY_PATH,
        handler: createAuthMiddleware(async (ctx) => {
          const token = ctx.query?.token;
          if (typeof token !== "string" || !token) {
            return;
          }

          const verification = await findVerificationToken({
            kind: "adminImpersonation",
            identifier: token,
          });

          if (
            !verification ||
            verification.isExpired ||
            verification.value.isAdminImpersonation !== true
          ) {
            return;
          }

          // Returned from the /magic-link/verify before hook so session.create.before
          // can read it on the same request. Better Auth merges `{ context }` onto the
          // endpoint context before the handler (and createSession) run.
          return {
            context: {
              adminImpersonationEmail: verification.value.email.toLowerCase(),
            },
          };
        }),
      },
    ],
  },
} satisfies BetterAuthPlugin;
