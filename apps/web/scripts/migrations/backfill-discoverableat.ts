import { buildSocialPlatformLookup } from "@/lib/social-utils";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { ACME_PROGRAM_ID } from "@dub/utils";
import "dotenv-flow/config";

async function main() {
  const where: Prisma.PartnerWhereInput = {
    discoverableAt: null,
    users: {
      some: {},
    },
    programs: {
      some: {
        programId: {
          not: ACME_PROGRAM_ID,
        },
        totalCommissions: {
          gt: 0,
        },
      },
    },
    platforms: {
      some: {},
    },
  };

  const partners = await prisma.partner.findMany({
    where,
    include: {
      platforms: true,
    },
  });

  // Format partners for display with platform handles
  const partnersForDisplay = partners.map((partner) => {
    const platformsMap = buildSocialPlatformLookup(partner.platforms);

    return {
      name: partner.name,
      email: partner.email,
      website: platformsMap.website?.handle || null,
      youtube: platformsMap.youtube?.handle || null,
      twitter: platformsMap.twitter?.handle || null,
      linkedin: platformsMap.linkedin?.handle || null,
      instagram: platformsMap.instagram?.handle || null,
      tiktok: platformsMap.tiktok?.handle || null,
    };
  });

  console.table(partnersForDisplay);

  const count = await prisma.partner.count({
    where,
  });

  console.log(`Found ${count} partners to backfill`);

  const res = await prisma.partner.updateMany({
    where: {
      id: {
        in: partners.map((partner) => partner.id),
      },
    },
    data: { discoverableAt: new Date() },
  });

  console.log(`Updated ${res.count} partners with users to be discoverable`);
}

main();
