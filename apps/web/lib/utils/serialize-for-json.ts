/**
 * Recursively convert bigint values to number in an object so it can be safely
 * passed to JSON.stringify (which throws on bigint by default).
 * Use before returning API responses that may contain Prisma BigInt fields.
 */
export function serializeForJson<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === "bigint") {
    return Number(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(serializeForJson) as T;
  }
  if (typeof obj === "object" && obj.constructor === Object) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeForJson(value);
    }
    return result as T;
  }
  return obj;
}
