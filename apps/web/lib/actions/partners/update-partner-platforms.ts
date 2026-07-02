"use server";

import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { prisma } from "@/lib/prisma";
import {
  MAX_PLATFORMS_PER_TYPE,
  sanitizeSocialHandle,
  sanitizeWebsite,
} from "@/lib/social-utils";
import { getPrettyUrl } from "@dub/utils";
import { PartnerPlatform, PlatformType, Prisma } from "@prisma/client";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const updatePartnerPlatformsSchema = z.object({
  platforms: z.array(
    z.object({
      type: z.enum(PlatformType),
      identifier: z.string(),
    }),
  ),
});

// Normalize an identifier for the given platform type.
// Returns null when the value is empty (treated as "not present").
// Throws when the value is non-empty but invalid.
function normalizeIdentifier(type: PlatformType, identifier: string) {
  const trimmed = identifier?.trim();

  if (!trimmed) {
    return null;
  }

  const sanitized =
    type === "website"
      ? sanitizeWebsite(trimmed)
      : sanitizeSocialHandle(trimmed, type);

  if (!sanitized) {
    throw new Error(
      type === "website"
        ? "Please enter a valid website URL."
        : `Please enter a valid ${type} handle.`,
    );
  }

  return sanitized;
}

function platformKey(type: PlatformType, identifier: string) {
  const canonical = type === "website" ? getPrettyUrl(identifier) : identifier;

  return `${type}:${canonical.toLowerCase()}`;
}

export const updatePartnerPlatformsAction = authPartnerActionClient
  .inputSchema(updatePartnerPlatformsSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;
    const { platforms } = parsedInput;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "partner_profile.update",
    });

    const seen = new Set<string>();
    const submitted: Pick<PartnerPlatform, "type" | "identifier">[] = [];
    const countByType = new Map<PlatformType, number>();

    for (const { type, identifier } of platforms) {
      const normalizedIdentifier = normalizeIdentifier(type, identifier);

      if (!normalizedIdentifier) {
        continue;
      }

      const key = platformKey(type, normalizedIdentifier);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      submitted.push({
        type,
        identifier: normalizedIdentifier,
      });

      const nextCount = (countByType.get(type) ?? 0) + 1;
      countByType.set(type, nextCount);

      if (nextCount > MAX_PLATFORMS_PER_TYPE) {
        throw new Error(
          `You can add up to ${MAX_PLATFORMS_PER_TYPE} ${type} handles.`,
        );
      }
    }

    await prisma.$transaction(
      async (tx) => {
        const existingPlatforms = await tx.partnerPlatform.findMany({
          where: {
            partnerId: partner.id,
          },
          select: {
            type: true,
            identifier: true,
          },
        });

        const existingKeys = new Set(
          existingPlatforms.map((p) => platformKey(p.type, p.identifier)),
        );

        // Delete existing rows that are no longer present in the submission
        const toDelete = existingPlatforms.filter(
          (p) => !seen.has(platformKey(p.type, p.identifier)),
        );

        // Create rows that are newly present. Existing rows are left untouched so
        // their verification state (verifiedAt) is preserved.
        const toCreate = submitted.filter(
          (p) => !existingKeys.has(platformKey(p.type, p.identifier)),
        );

        if (toDelete.length > 0) {
          await tx.partnerPlatform.deleteMany({
            where: {
              partnerId: partner.id,
              OR: toDelete.map(({ type, identifier }) => ({
                type,
                identifier,
              })),
            },
          });
        }

        if (toCreate.length > 0) {
          await tx.partnerPlatform.createMany({
            data: toCreate.map(({ type, identifier }) => ({
              partnerId: partner.id,
              type,
              identifier,
            })),
            skipDuplicates: true,
          });
        }
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );
  });
