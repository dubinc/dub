import { Prisma } from "@dub/prisma/client";

const DEFAULT_CONFIG = {
  maxRetries: 2,
  retryDelay: 1000, // 1 second
  exponentialBackoff: true,
};

const NON_RETRIABLE_ERROR_CODES = new Set([
  "P2000", // Value too long for column
  "P2001", // Record not found for where condition
  "P2002", // Unique constraint violation
  "P2003", // Foreign key constraint violation
  "P2025", // Record not found for operation
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
        // Only exclude permanent errors, not connection issues
        if (NON_RETRIABLE_ERROR_CODES.has(error.code)) {
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
