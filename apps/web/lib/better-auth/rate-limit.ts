import { shouldApplyRateLimit } from "@/lib/api/environment";
import { ratelimit } from "@/lib/upstash/ratelimit";
import {
  RATELIMIT_POLICIES,
  type RatelimitPolicy,
} from "@/lib/upstash/ratelimit-policies";
import type { BetterAuthOptions } from "better-auth";
import { APIError, getSessionFromCtx } from "better-auth/api";
import { normalizeEmail } from "./utils";

export const authRateLimit = {
  enabled: true,
  storage: "secondary-storage",
  window: 10,
  max: 100,
  customRules: {
    // Sign-in / OAuth entrypoints (higher IP ceilings for shared NAT / office egress)
    "/sign-in/email": { window: 60, max: 20 },
    "/sign-in/magic-link": { window: 60, max: 10 },
    "/sign-in/social": { window: 60, max: 20 },
    "/sign-in/oauth2": { window: 60, max: 20 },
    "/sign-in/saml-idp": { window: 60, max: 20 },

    // Magic link consume
    "/magic-link/verify": { window: 60, max: 5 },

    // Password reset
    "/request-password-reset": { window: 60, max: 2 },
    "/reset-password": { window: 60, max: 2 },
    "/reset-password/*": { window: 60, max: 2 },

    // Account mutation
    "/change-password": { window: 60, max: 5 },
    "/change-email": { window: 60, max: 3 },
    "/send-verification-email": { window: 60, max: 3 },
    "/verify-email": { window: 60, max: 10 },

    // Account linking
    "/link-social": { window: 60, max: 10 },
    "/oauth2/link": { window: 60, max: 10 },

    // OAuth callbacks (brute-force / replay noise)
    "/callback/*": { window: 60, max: 30 },
    "/oauth2/callback/*": { window: 60, max: 30 },
  },
} satisfies NonNullable<BetterAuthOptions["rateLimit"]>;

type AuthRateLimitIdentifier = "email" | "token" | "userId";

type AuthRateLimitRule = {
  policy: RatelimitPolicy;
  identifier: AuthRateLimitIdentifier;
  message?: string;
};

const CUSTOM_AUTH_RATE_LIMIT_RULES: Record<string, AuthRateLimitRule> = {
  "/request-password-reset": {
    policy: RATELIMIT_POLICIES.passwordResetRequest,
    identifier: "email",
  },
  "/reset-password": {
    policy: RATELIMIT_POLICIES.passwordReset,
    identifier: "token",
  },
  "/change-password": {
    policy: RATELIMIT_POLICIES.passwordChange,
    identifier: "userId",
  },
  "/change-email": {
    policy: RATELIMIT_POLICIES.emailChangeRequest,
    identifier: "userId",
  },
  "/sign-in/email": {
    policy: RATELIMIT_POLICIES.login,
    identifier: "email",
  },
  "/sign-in/magic-link": {
    policy: RATELIMIT_POLICIES.loginLinkSend,
    identifier: "email",
    // exact error code matched by the sign-in page, must stay verbatim
    message: "too-many-login-attempts",
  },
};

async function resolveRateLimitIdentifier({
  ctx,
  kind,
}: {
  ctx: Parameters<typeof getSessionFromCtx>[0];
  kind: AuthRateLimitIdentifier;
}) {
  if (kind === "email") {
    return normalizeEmail(ctx.body?.email) || null;
  }

  if (kind === "token") {
    if (typeof ctx.body?.token === "string" && ctx.body.token) {
      return ctx.body.token;
    }

    if (typeof ctx.query?.token === "string" && ctx.query.token) {
      return ctx.query.token;
    }

    return null;
  }

  const session = await getSessionFromCtx(ctx);
  return session?.user?.id ?? null;
}

// Additional email/userId/token-keyed limits on top of BA's IP + path rateLimit.
// BA customRules still apply first; this runs in before hooks for per-identity abuse.
export async function enforceAuthRateLimit(
  ctx: Parameters<typeof getSessionFromCtx>[0],
) {
  if (!shouldApplyRateLimit) {
    return;
  }

  const rule = CUSTOM_AUTH_RATE_LIMIT_RULES[ctx.path];
  if (!rule) {
    return;
  }

  const identifier = await resolveRateLimitIdentifier({
    ctx,
    kind: rule.identifier,
  });

  if (!identifier) {
    return;
  }

  const { success } = await ratelimit(
    rule.policy.attempts,
    rule.policy.window,
  ).limit(`${rule.policy.keyPrefix}:${identifier}`);

  if (!success) {
    throw new APIError("TOO_MANY_REQUESTS", {
      message:
        rule.message ??
        (typeof rule.policy.message === "string"
          ? rule.policy.message
          : "Too many requests. Please try again later."),
    });
  }
}
