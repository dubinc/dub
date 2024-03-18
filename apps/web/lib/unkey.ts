import { NoopRatelimit, Ratelimit } from "@unkey/ratelimit";

// only warn once
let warned = false;

// Create a new ratelimiter, that allows 10 requests per 10 seconds by default
export const ratelimit = (
  limit: number = 10,
  duration:
    | `${number} ms`
    | `${number} s`
    | `${number} m`
    | `${number} h`
    | `${number} d` = "10 s",
) => {
  const rootKey = process.env.UNKEY_ROOT_KEY;
  if (!rootKey) {
    if (!warned) {
      console.warn("Ratelimit is not configured");
      warned = true;
    }
    return new NoopRatelimit();
  }
  return new Ratelimit({
    rootKey,
    namespace: "dub",
    limit,
    duration,
    async: true,
  });
};
