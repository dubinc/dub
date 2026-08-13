const TRANSIENT_RETRY_ATTEMPTS = 2;

function isTransientError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);

  // fetch network failures surface as TypeError ("fetch failed"), but so do
  // ordinary programming errors — only the network ones deserve a retry.
  if (error instanceof TypeError) {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("fetch failed") ||
      normalized.includes("network") ||
      normalized.includes("load failed")
    );
  }

  return /\b(429|500|502|503|504)\b|rate.?limit|timeout|timed out|fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(
    message,
  );
}

function isTimeoutError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timeout|timed out|ETIMEDOUT/i.test(message);
}

export async function withTransientRetry<T>(
  operation: () => Promise<T>,
  { retryTimeouts = true }: { retryTimeouts?: boolean } = {},
): Promise<T> {
  for (let attempt = 1; attempt <= TRANSIENT_RETRY_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (
        attempt === TRANSIENT_RETRY_ATTEMPTS ||
        !isTransientError(error) ||
        (!retryTimeouts && isTimeoutError(error))
      ) {
        throw error;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, 50 * attempt + Math.random() * 25),
      );
    }
  }

  throw new Error("Partner search operation failed.");
}

/**
 * Rejects if `operation` has not settled within `timeoutMs`. The operation is
 * not cancelled — `Promise.race` cannot do that — so only pass work that
 * settles on its own.
 */
export async function withDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  message: string,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeout]);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function withQueryDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  return withDeadline(
    // A request timeout consumes nearly the full SLA budget, so only retry
    // transient failures such as rate limits and 503s that return quickly.
    () => withTransientRetry(operation, { retryTimeouts: false }),
    timeoutMs,
    `Partner search query timed out after ${timeoutMs}ms.`,
  );
}
