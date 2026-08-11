const TRANSIENT_RETRY_ATTEMPTS = 2;

function isTransientError(error: unknown): boolean {
  if (error instanceof TypeError) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
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

export async function withQueryDeadline<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () =>
        reject(
          new Error(`Partner search query timed out after ${timeoutMs}ms.`),
        ),
      timeoutMs,
    );
  });

  try {
    // A request timeout consumes nearly the full SLA budget, so only retry
    // transient failures such as rate limits and 503s that return quickly.
    return await Promise.race([
      withTransientRetry(operation, { retryTimeouts: false }),
      timeout,
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}
