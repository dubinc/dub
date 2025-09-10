import { Prisma } from "@dub/prisma/client";

const DEFAULT_CONFIG = {
  maxRetries: 2,
  retryDelay: 1000, // 1 second
  exponentialBackoff: true,
};

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

      // Don't retry unique constraint violations, FK violations, or not-found
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        throw error;
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
