import { pluralize } from "@dub/utils";
import { shouldApplyRateLimit } from "../api/environment";
import { DubApiError } from "../api/errors";
import { ratelimit } from "./ratelimit";
import { RatelimitPolicy } from "./ratelimit-policies";

// Formats ms until reset as a human-friendly duration
export const formatRetryAfter = (resetAt: number) => {
  const seconds = Math.max(Math.ceil((resetAt - Date.now()) / 1000), 1);

  if (seconds < 60) {
    return `${seconds} ${pluralize("second", seconds)}`;
  }

  const minutes = Math.ceil(seconds / 60);

  if (minutes < 60) {
    return `${minutes} ${pluralize("minute", minutes)}`;
  }

  const hours = Math.ceil(minutes / 60);

  return `${hours} ${pluralize("hour", hours)}`;
};

// Enforces a rate limit policy for the given identifier, throwing a
// rate_limit_exceeded DubApiError when the limit is exceeded
export async function assertRateLimit({
  policy,
  identifier,
}: {
  policy: RatelimitPolicy;
  identifier: string | string[]; // dynamic part(s) of the key, e.g. email or [email, ip]
}) {
  if (!shouldApplyRateLimit) {
    return;
  }

  const key = [
    policy.keyPrefix,
    ...(Array.isArray(identifier) ? identifier : [identifier]),
  ].join(":");

  const { success, reset } = await ratelimit(
    policy.attempts,
    policy.window,
  ).limit(key);

  if (!success) {
    const retryAfter = formatRetryAfter(reset);

    const message =
      typeof policy.message === "function"
        ? policy.message({
            retryAfter,
            attempts: policy.attempts,
            window: policy.window,
          })
        : policy.message ??
          `Too many requests. Please try again in ${retryAfter}.`;

    throw new DubApiError({
      code: "rate_limit_exceeded",
      message,
    });
  }
}
