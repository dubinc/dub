export function sanitizeTimezone(timezone?: string): string {
  if (!timezone) return "UTC";

  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    return "UTC";
  }
}
