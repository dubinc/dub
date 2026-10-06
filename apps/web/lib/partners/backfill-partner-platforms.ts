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
const mergeApplicationSocialPlatforms = ({
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
 * Saves the website and social profiles from a program application that the
 * partner's profile doesn't have yet (e.g. they skipped them during onboarding).
 *
 * Existing profile platforms are never overwritten, since they may be verified.
 * New ones are sanitized and saved as unverified.
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
  application,
}: {
  partnerId: string;
  platforms: PartnerPlatform[];
  application: ProgramApplication;
}) {
  const { missingPlatforms } = mergeApplicationSocialPlatforms({
    platforms,
    application,
  });

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
