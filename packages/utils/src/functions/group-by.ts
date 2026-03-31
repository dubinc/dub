export function groupBy<T>(
  items: readonly T[],
  keyFn: (item: T) => string,
): Record<string, T[]> {
  const result: Record<string, T[]> = {};

  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }

  return result;
}
