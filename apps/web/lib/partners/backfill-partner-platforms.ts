import { prisma } from "@/lib/prisma";
import {
  buildSocialPlatformLookup,
  polyfillSocialMediaFields,
  sanitizeSocialHandle,
  sanitizeWebsite,
} from "@/lib/social-utils";
import {
  PartnerPlatform,
  PlatformType,
  ProgramApplication,
} from "@prisma/client";
import { formatWebsiteAndSocialsFields } from "./format-application-form-data";

type ApplicationPlatform = Pick<
  PartnerPlatform,
  "type" | "identifier" | "verifiedAt"
>;

// Merges the partner's profile platforms with the website/socials from the application,
// so webhook payloads and the platform backfill agree on what the partner has.
// Application values only fill in platforms the partner doesn't already have (the
// profile may be verified), and are marked unverified.
export const mergeApplicationSocialPlatforms = ({
  platforms,
  application,
}: {
  platforms: ApplicationPlatform[];
  application: ProgramApplication;
}) => {
  const platformsLookup = buildSocialPlatformLookup(platforms);
  const formValues = formatWebsiteAndSocialsFields(application);

  const sanitize = (type: PlatformType, value: string | null | undefined) =>
    type === "website"
      ? sanitizeWebsite(value)
      : sanitizeSocialHandle(value, type);

  const missingPlatforms: ApplicationPlatform[] = Object.values(
    PlatformType,
  ).flatMap((type) => {
    if (platformsLookup[type]?.identifier) {
      return [];
    }

    const identifier =
      sanitize(type, formValues[type]) || sanitize(type, application[type]);

    if (!identifier) {
      return [];
    }

    return [
      {
        type,
        identifier,
        verifiedAt: null,
      },
    ];
  });

  const resolvedPlatforms = [...platforms, ...missingPlatforms];

  return {
    platforms: resolvedPlatforms,
    missingPlatforms,
    socialFields: polyfillSocialMediaFields(resolvedPlatforms),
  };
};

/**
 * Saves the website and social profiles from program applications that the
 * partner's profile doesn't have yet (e.g. they skipped them during onboarding).
 *
 * Existing profile platforms are never overwritten, since they may be verified.
 * New ones are sanitized and saved as unverified. When several applications
 * provide the same platform, the earliest one in `applications` wins.
 *
 * Returns the partner's platforms as they are actually stored after the backfill,
 * along with the matching flat social fields (`website`, `youtube`, etc.). Re-reading
 * matters because `skipDuplicates` or a concurrent insert can keep a different
 * identifier than the application's. If the backfill fails, the error is logged and
 * the given `platforms` are returned unchanged, so callers can still send webhooks.
 */
export async function backfillPartnerPlatforms({
  partnerId,
  platforms,
  applications,
}: {
  partnerId: string;
  platforms: PartnerPlatform[];
  applications: ProgramApplication[];
}) {
  const missingPlatforms: ApplicationPlatform[] = [];

  for (const application of applications) {
    const merged = mergeApplicationSocialPlatforms({
      platforms: [...platforms, ...missingPlatforms],
      application,
    });

    missingPlatforms.push(...merged.missingPlatforms);
  }

  let savedPlatforms = platforms;

  try {
    if (missingPlatforms.length > 0) {
      await prisma.partnerPlatform.createMany({
        skipDuplicates: true,
        data: missingPlatforms.map(({ type, identifier }) => ({
          partnerId,
          type,
          identifier,
        })),
      });

      savedPlatforms = await prisma.partnerPlatform.findMany({
        where: {
          partnerId,
        },
      });
    }
  } catch (error) {
    console.error("Failed to backfill partner platforms", error);
  }

  return {
    platforms: savedPlatforms,
    socialFields: polyfillSocialMediaFields(savedPlatforms),
  };
}
