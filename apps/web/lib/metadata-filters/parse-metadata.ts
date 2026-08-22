import type { Prisma } from "@prisma/client";

export function parseMetadata(
  metadata: Prisma.JsonValue,
): Record<string, unknown> | null {
  if (metadata == null) {
    return null;
  }

  if (typeof metadata === "string") {
    try {
      return JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  if (typeof metadata === "object" && !Array.isArray(metadata)) {
    return metadata;
  }

  return null;
}
