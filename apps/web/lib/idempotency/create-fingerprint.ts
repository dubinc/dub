import { createHash } from "crypto";

function normalize(value: unknown): unknown {
  if (value === undefined || value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};

    for (const key of Object.keys(obj).sort()) {
      sorted[key] = normalize(obj[key]);
    }

    return sorted;
  }

  return value;
}

export function createFingerprint(payload: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(normalize(payload)))
    .digest("hex");
}
