export function toErrorMessage(
  error: unknown,
  fallback = "Something went wrong.",
): string {
  if (error instanceof Error) {
    return error.message || fallback;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error;

    if (typeof message === "string" && message) {
      return message;
    }
  }

  return fallback;
}
