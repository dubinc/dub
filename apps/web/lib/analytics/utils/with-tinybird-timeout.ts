import { DubApiError } from "@/lib/api/errors";
import { serializeError } from "@dub/utils";

// Tinybird stops a query after 30s. Return a 400 with a hint instead of a 500.
export async function withTinybirdTimeout<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise;
  } catch (error) {
    if (serializeError(error).includes("Timeout exceeded")) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "The analytics query took too long. Use a shorter date range or add filters, then try again.",
      });
    }

    throw error;
  }
}
