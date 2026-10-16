export function missingAccountMessage(data: unknown) {
  if (typeof data !== "object" || data === null || !("message" in data)) {
    return null;
  }

  const { message } = data;

  if (typeof message !== "string") {
    return null;
  }

  const normalized = message.toLowerCase();

  if (
    !normalized.includes("doesn't exist") &&
    !normalized.includes("does not exist")
  ) {
    return null;
  }

  return message;
}
