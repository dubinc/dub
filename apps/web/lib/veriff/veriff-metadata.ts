import { Prisma } from "@dub/prisma/client";
import * as z from "zod/v4";

const veriffMetadataSchema = z.object({
  sessionExpiresAt: z.coerce.date().nullable().optional().default(null),
  sessionUrl: z.string().nullable().optional().default(null),
  declineReason: z.string().nullable().optional().default(null),
  attemptCount: z.number().int().nonnegative().optional().default(0),
});

type VeriffMetadata = z.infer<typeof veriffMetadataSchema>;

const defaultVeriffMetadata = veriffMetadataSchema.parse({
  sessionExpiresAt: null,
  sessionUrl: null,
  declineReason: null,
  attemptCount: 0,
});

export function flattenVeriffMetadata<
  T extends { veriffMetadata: Prisma.JsonValue | null },
>(partner: T) {
  const { veriffMetadata, ...rest } = partner;
  const metadata = parseVeriffMetadata(veriffMetadata);

  return {
    ...rest,
    identityVerificationAttemptCount: metadata.attemptCount,
    identityVerificationDeclineReason: metadata.declineReason,
    veriffSessionExpiresAt: metadata.sessionExpiresAt,
    veriffSessionUrl: metadata.sessionUrl,
  };
}

export function parseVeriffMetadata(
  json: Prisma.JsonValue | null | undefined,
): VeriffMetadata {
  if (json == null || typeof json !== "object" || Array.isArray(json)) {
    return defaultVeriffMetadata;
  }

  try {
    return veriffMetadataSchema.parse(json);
  } catch (error) {
    return defaultVeriffMetadata;
  }
}

export function mergeVeriffMetadata(
  existing: Prisma.JsonValue | null | undefined,
  patch: Partial<VeriffMetadata>,
): Prisma.InputJsonValue {
  const base = parseVeriffMetadata(existing);

  const next: VeriffMetadata = {
    ...base,
    ...patch,
  };

  return {
    sessionExpiresAt: next.sessionExpiresAt?.toISOString() ?? null,
    sessionUrl: next.sessionUrl,
    declineReason: next.declineReason,
    attemptCount: next.attemptCount,
  };
}
