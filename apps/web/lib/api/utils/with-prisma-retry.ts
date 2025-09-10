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

  for (let attempt = 0; attempt < config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain errors (e.g., validation errors, unique constraint violations)
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Don't retry unique constraint violations or validation errors
        if (error.code === "P2002" || error.code === "P2003") {
          throw error;
        }
      }

      // Don't retry on the last attempt
      if (attempt === config.maxRetries - 1) {
        console.error(`Failed after ${config.maxRetries} attempts:`, error);
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = config.exponentialBackoff
        ? config.retryDelay * Math.pow(2, attempt)
        : config.retryDelay;

      console.warn(
        `Failed (attempt ${attempt + 1}/${config.maxRetries}), retrying in ${delay}ms:`,
        error.message,
      );

      // Add delay before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
