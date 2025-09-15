import { Prisma } from "@dub/prisma/client";

const DEFAULT_CONFIG = {
  maxRetries: 3,
  retryDelay: 500, // 500ms
  exponentialBackoff: true,
};

const RETRIABLE_ERROR_CODES = new Set([
  "P1001",
  "P1002",
  "P1003",
  "P1008",
  "P1011",
  "P1017",
  "P2024",
  "P2028",
  "P2037",
]);

// Helper function for retrying operations
export async function withPrismaRetry<T>(
  operation: () => Promise<T>,
  config = DEFAULT_CONFIG,
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (!RETRIABLE_ERROR_CODES.has(error.code)) {
          throw error;
        }
      }

      // Also avoid retrying on validation errors
      if (error instanceof Prisma.PrismaClientValidationError) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        console.error(`Failed after ${config.maxRetries + 1} attempts:`, error);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = config.exponentialBackoff
        ? config.retryDelay * Math.pow(2, attempt)
        : config.retryDelay;

      console.warn(
        `Failed (attempt ${attempt + 1}/${config.maxRetries + 1}), retrying in ${delay}ms:`,
        error.message,
      );

      // Add delay before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
