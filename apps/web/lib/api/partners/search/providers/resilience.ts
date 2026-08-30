import {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
} from "@turbopuffer/turbopuffer";

const TRANSIENT_RETRY_ATTEMPTS = 2;

function isTransientError(error: unknown): boolean {
  // The SDK's errors carry the status code, so it is read rather than sniffed
  // out of the message, where a stray "500" in an ID or a count would
  // misclassify a permanent failure as transient.
  if (error instanceof APIError) {
    return (
      error instanceof APIConnectionError ||
      error.status === 429 ||
      (typeof error.status === "number" && error.status >= 500)
    );
  }

  const message = error instanceof Error ? error.message : String(error);

  // fetch network failures surface as TypeError ("fetch failed"), but so do
  // ordinary programming errors, and only the network ones deserve a retry.
  if (error instanceof TypeError) {
    const normalized = message.toLowerCase();
    return (
      normalized.includes("fetch failed") ||
      normalized.includes("network") ||
      normalized.includes("load failed")
    );
  }

  return /timeout|timed out|fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(
    message,
  );
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof APIConnectionTimeoutError) {
    return true;
  }

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
 * not cancelled, because `Promise.race` cannot do that, so only pass work that
 * settles on its own.
 */
async function withDeadline<T>(
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
