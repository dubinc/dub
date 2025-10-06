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
    industryInterests: {
      some: {},
    },
    salesChannels: {
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
  };
  const partners = await prisma.partner.findMany({
    where,
  });
  console.table(partners, [
    "name",
    "email",
    "website",
    "youtube",
    "twitter",
    "linkedin",
    "instagram",
    "tiktok",
  ]);
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
