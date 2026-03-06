/**
 * Normalize a cents value from Prisma (number before migration, bigint after) to number.
 * Use for display, JSON serialization, and anywhere a number is required.
 */
export function toCentsNumber(
  value: number | bigint | null | undefined,
): number {
  if (value == null) return 0;
  return typeof value === "bigint" ? Number(value) : value;
}
