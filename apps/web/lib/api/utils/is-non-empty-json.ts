export function isNonEmptyJson(jsonString?: string | null): boolean {
  if (!jsonString) {
    return false;
  }

  try {
    const parsed = JSON.parse(jsonString);

    return (
      parsed !== null &&
      typeof parsed === "object" &&
      Object.keys(parsed).length > 0
    );
  } catch {
    return false;
  }
}
