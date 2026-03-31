import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";

// script to backfill link cache for links with webhooks
async function main() {
  const where: Prisma.LinkWhereInput = {
    programId: {
      not: null,
    },
    leads: {
      gt: 0,
    },
    lastLeadAt: null,
  };

  console.time("findMany");
  const links = await prisma.link.findMany({
    where,
    take: 5000,
    select: {
      id: true,
      shortLink: true,
      leads: true,
      lastLeadAt: true,
      customers: {
        select: {
          email: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
  console.timeEnd("findMany");

  console.time("updateMany");
  for (const link of links) {
    if (link.customers.length === 0) {
      console.log(`No customers for ${link.shortLink}`);
      continue;
    }

    const res = await prisma.link.update({
      where: { id: link.id },
      data: {
        lastLeadAt: link.customers[0].createdAt,
      },
    });
    console.log(`Updated ${link.shortLink} with lastLeadAt: ${res.lastLeadAt}`);
  }
  console.timeEnd("updateMany");

  console.time("count");
  const remaining = await prisma.link.count({
    where,
  });
  console.timeEnd("count");

  console.log(`Updated ${links.length} links, ${remaining} remaining`);
}

main();
