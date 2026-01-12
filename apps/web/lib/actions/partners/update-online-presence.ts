"use server";

import { upsertPartnerPlatform } from "@/lib/api/partner-profile/upsert-partner-platform";
import { sanitizeSocialHandle, sanitizeWebsite } from "@/lib/social-utils";
import { parseUrlSchemaAllowEmpty } from "@/lib/zod/schemas/utils";
import { prisma } from "@dub/prisma";
import { PartnerPlatform, PlatformType } from "@dub/prisma/client";
import { isValidUrl } from "@dub/utils";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

/**
 * Helper function to create a schema for social platform handles.
 * Preserves undefined (ignore) and null (remove), sanitizes string values.
 */
const createSocialPlatformSchema = (platform: PlatformType) => {
  return z
    .string()
    .nullish()
    .transform((input) => {
      if (input === undefined) return undefined;
      if (input === null) return null;
      return sanitizeSocialHandle(input, platform);
    });
};

/**
 * Helper function to create a schema for website URLs.
 * Preserves undefined (ignore) and null (remove), sanitizes string values.
 */
const createWebsiteSchema = () => {
  return parseUrlSchemaAllowEmpty()
    .nullish()
    .transform((input) => {
      if (input === undefined) return undefined;
      if (input === null) return null;
      return sanitizeWebsite(input);
    })
    .refine(
      (value) => {
        return !value || isValidUrl(value);
      },
      {
        message: "Invalid website URL.",
      },
    );
};

const updateOnlinePresenceSchema = z.object({
  website: createWebsiteSchema(),
  youtube: createSocialPlatformSchema("youtube"),
  twitter: createSocialPlatformSchema("twitter"),
  linkedin: createSocialPlatformSchema("linkedin"),
  instagram: createSocialPlatformSchema("instagram"),
  tiktok: createSocialPlatformSchema("tiktok"),
  source: z.enum(["onboarding", "settings"]).default("onboarding"),
});

export const updateOnlinePresenceAction = authPartnerActionClient
  .inputSchema(updateOnlinePresenceSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;

    const partnerPlatform = await prisma.partnerPlatform.findMany({
      where: {
        partnerId: partner.id,
      },
    });

    const platformIdentifiers = new Map(
      partnerPlatform.map((p) => [p.type, p.identifier]),
    );

    const partnerPlatformsData: Pick<
      PartnerPlatform,
      "type" | "identifier" | "verifiedAt"
    >[] = [];

    const platformsToDelete: Array<{
      partnerId: string;
      type: PlatformType;
    }> = [];

    // Define platform configurations
    // null = remove, undefined = ignore (no changes)
    const platformConfigs: Array<{
      platform: PlatformType;
      inputValue: string | null | undefined;
    }> = [
      { platform: "youtube", inputValue: parsedInput.youtube },
      { platform: "twitter", inputValue: parsedInput.twitter },
      { platform: "linkedin", inputValue: parsedInput.linkedin },
      { platform: "instagram", inputValue: parsedInput.instagram },
      { platform: "tiktok", inputValue: parsedInput.tiktok },
      { platform: "website", inputValue: parsedInput.website },
    ];

    for (const { platform, inputValue } of platformConfigs) {
      const currentIdentifier = platformIdentifiers.get(platform);

      // Handle deletion: null = remove
      if (inputValue === null && currentIdentifier !== undefined) {
        platformsToDelete.push({
          partnerId: partner.id,
          type: platform,
        });
        continue;
      }

      // Handle update: non-null, non-undefined value that differs from current
      if (
        inputValue !== undefined &&
        inputValue !== null &&
        inputValue !== currentIdentifier
      ) {
        // Special handling for website: check domain change
        if (platform === "website") {
          let domainChanged = false;

          try {
            const oldDomain = currentIdentifier
              ? new URL(currentIdentifier).hostname
              : null;
            const newDomain = inputValue ? new URL(inputValue).hostname : null;

            domainChanged =
              oldDomain?.toLowerCase() !== newDomain?.toLowerCase();
          } catch (error) {
            console.error("Failed to get domain from partner website", error);
            domainChanged = true;
          }

          if (domainChanged) {
            partnerPlatformsData.push({
              type: "website",
              identifier: inputValue,
              verifiedAt: null,
            });
          }
        } else {
          // For all other platforms, update if value changed
          partnerPlatformsData.push({
            type: platform,
            identifier: inputValue,
            verifiedAt: null,
          });
        }
      }
    }

    // Execute deletions and updates in parallel
    const operations: Promise<unknown>[] = [];

    if (platformsToDelete.length > 0) {
      operations.push(
        ...platformsToDelete.map(({ partnerId, type }) =>
          prisma.partnerPlatform.delete({
            where: {
              partnerId_type: {
                partnerId,
                type,
              },
            },
          }),
        ),
      );
    }

    if (partnerPlatformsData.length > 0) {
      operations.push(
        ...partnerPlatformsData.map((item) =>
          upsertPartnerPlatform({
            where: {
              partnerId: partner.id,
              type: item.type,
            },
            data: {
              identifier: item.identifier,
              verifiedAt: item.verifiedAt,
            },
          }),
        ),
      );
    }

    if (operations.length === 0) {
      return;
    }

    await Promise.all(operations);
  });
