export function capitalize(str?: string | null): string | null | undefined {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}
