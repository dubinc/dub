import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

async function main() {
  let startingAfter: string | undefined = undefined;

  while (true) {
    console.log(
      `Fetching partners starting after ${startingAfter ?? "beginning"}...`,
    );

    const partners = await prisma.partner.findMany({
      where: {
        OR: [
          {
            website: {
              not: null,
            },
          },
          {
            youtube: {
              not: null,
            },
          },
          {
            twitter: {
              not: null,
            },
          },
          {
            linkedin: {
              not: null,
            },
          },
          {
            instagram: {
              not: null,
            },
          },
          {
            tiktok: {
              not: null,
            },
          },
        ],
      },
      take: 100,
      orderBy: {
        id: "asc",
      },
      ...(startingAfter
        ? {
            skip: 1,
            cursor: {
              id: startingAfter,
            },
          }
        : {}),
    });

    if (partners.length === 0) {
      console.log("Finished processing partners.");
      break;
    }

    const partnerPlatforms: Omit<
      Prisma.PartnerPlatformCreateManyInput,
      "id" | "createdAt" | "updatedAt"
    >[] = [];

    for (const partner of partners) {
      const commonFields = {
        partnerId: partner.id,
        posts: BigInt(0),
        views: BigInt(0),
        followers: BigInt(0),
        metadata: Prisma.DbNull,
        platformId: null,
      };

      if (partner.website) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "website",
          handle: partner.website,
          verifiedAt: partner.websiteVerifiedAt,
          metadata: partner.websiteTxtRecord
            ? { websiteTxtRecord: partner.websiteTxtRecord }
            : Prisma.DbNull,
        });
      }

      if (partner.youtube) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "youtube",
          handle: partner.youtube,
          platformId: partner.youtubeChannelId,
          verifiedAt: partner.youtubeVerifiedAt,
          posts: BigInt(partner.youtubeVideoCount),
          views: BigInt(partner.youtubeViewCount),
          followers: BigInt(partner.youtubeSubscriberCount),
        });
      }

      if (partner.twitter) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "twitter",
          handle: partner.twitter,
          verifiedAt: partner.twitterVerifiedAt,
        });
      }

      if (partner.linkedin) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "linkedin",
          handle: partner.linkedin,
          verifiedAt: partner.linkedinVerifiedAt,
        });
      }

      if (partner.instagram) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "instagram",
          handle: partner.instagram,
          verifiedAt: partner.instagramVerifiedAt,
        });
      }

      if (partner.tiktok) {
        partnerPlatforms.push({
          ...commonFields,
          platform: "tiktok",
          handle: partner.tiktok,
          verifiedAt: partner.tiktokVerifiedAt,
        });
      }
    }

    if (partnerPlatforms.length > 0) {
      console.table(partnerPlatforms);

      const { count } = await prisma.partnerPlatform.createMany({
        data: partnerPlatforms,
        skipDuplicates: true,
      });

      console.log(`Added ${count} partner platforms.`);
    }

    startingAfter = partners[partners.length - 1].id;

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

main();
