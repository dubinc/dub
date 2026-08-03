import { waitUntil } from "@vercel/functions";
import { headers } from "next/headers";
import { DubApiError } from "../api/errors";
import { getIP } from "../api/utils/get-ip";
import { logger, toErrorFields } from "../axiom/server";

const AUTH_FAILURE_MESSAGE = "auth.failure";

type AuthAction = "email_change_request" | "email_change_confirm";

const AUTH_FAILURE_REASONS = [
  "rate-limit-exceeded",
  "email-domain-blocked",
  "invalid-token",
  "expired-token",
  "missing-partner-id",
  "unauthorized",
  "unknown",
] as const;

type AuthFailureReason = (typeof AUTH_FAILURE_REASONS)[number];

const KNOWN_REASONS = new Set<string>(AUTH_FAILURE_REASONS);

// Maps errors whose message is already a reason code and rate-limit
// DubApiErrors to a typed reason, so catch blocks don't need their own
// mapping logic.
const authFailureReasonFromError = (error: unknown): AuthFailureReason => {
  if (error instanceof DubApiError && error.code === "rate_limit_exceeded") {
    return "rate-limit-exceeded";
  }

  if (error instanceof Error && KNOWN_REASONS.has(error.message)) {
    return error.message as AuthFailureReason;
  }

  return "unknown";
};

interface LogAuthFailureParams {
  action: AuthAction;
  reason?: AuthFailureReason;
  email?: string;
  userId?: string;
  error?: unknown;
}

export const logAuthFailure = ({
  action,
  reason: reasonProp,
  email,
  userId,
  error,
}: LogAuthFailureParams) => {
  const reason = reasonProp ?? authFailureReasonFromError(error);

  waitUntil(
    (async () => {
      let ip: string | undefined;
      let userAgent: string | undefined;

      // headers() is unavailable in some NextAuth callback contexts
      try {
        ip = await getIP();
        userAgent = (await headers()).get("user-agent") ?? undefined;
      } catch {
        // Ignore — request context may not be available
      }

      logger.warn(AUTH_FAILURE_MESSAGE, {
        source: "auth",
        outcome: "failure",
        action,
        reason,
        rateLimited: reason === "rate-limit-exceeded",
        ip,
        userAgent,
        userId,
        email,
        ...(error !== undefined && { error: toErrorFields(error) }),
      });

      await logger.flush();
    })(),
  );
};

export const withAuthFailureLogging = async <T>(
  context: Omit<LogAuthFailureParams, "error">,
  callback: () => Promise<T>,
): Promise<T> => {
  try {
    return await callback();
  } catch (error) {
    logAuthFailure({
      ...context,
      reason: context.reason ?? authFailureReasonFromError(error),
      error,
    });

    throw error;
  }
};
