import { ratelimit } from "../upstash";

export async function rateLimitRequest({
  identifier,
  requests,
  interval,
}: {
  identifier: string;
  requests: number;
  interval: `${number} s` | `${number} m`;
}) {
  const { success, limit, reset, remaining } = await ratelimit(
    requests,
    interval,
  ).limit(identifier);

  return {
    success,
    headers: {
      "Retry-After": reset.toString(),
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": reset.toString(),
    },
  };
}
