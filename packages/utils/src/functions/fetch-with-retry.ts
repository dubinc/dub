export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit | undefined,
  options: {
    timeout?: number;
    maxRetries?: number;
    retryDelay?: number;
  } = {},
): Promise<Response> {
  const { timeout = 5000, maxRetries = 10, retryDelay = 1000 } = options;

  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // Handle rate limiting and server errors
      if (response.status === 429 || response.status >= 500) {
        const delay = retryDelay + Math.pow(i, 2) * 50;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      // Handle unauthorized errors
      if (response.status === 403) {
        throw new Error("Unauthorized");
      }

      // Handle other errors
      if (!response.ok) {
        let errorMessage: string;
        try {
          const error = await response.json();
          errorMessage = error.error || `HTTP error ${response.status}`;
        } catch {
          errorMessage = `HTTP error ${response.status}`;
        }
        console.error(`fetchWithRetry error: ${errorMessage}`);
        throw new Error(errorMessage);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this is the last retry, throw the error
      if (i === maxRetries - 1) {
        const errMsg = `Failed after ${maxRetries} retries. Last error: ${lastError.message}`;
        console.error(`fetchWithRetry error: ${errMsg}`);
        throw new Error(errMsg);
      }

      // For network errors or timeouts, wait and retry
      const delay = retryDelay + Math.pow(i, 2) * 50;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached due to the throw in the last retry,
  // but TypeScript needs it for type safety
  throw new Error(`Failed after ${maxRetries} retries`);
}
