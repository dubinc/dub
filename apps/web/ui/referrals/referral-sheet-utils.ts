// Formats a formData field value for display
export function formatFormDataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join(", ");
  }

  if (typeof value === "object" && "toISOString" in value) {
    try {
      return new Date(value as Date).toLocaleDateString();
    } catch {
      return String(value);
    }
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value);
}
