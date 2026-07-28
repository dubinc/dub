import { prisma } from "@/lib/prisma";
import { DUB_DOMAINS } from "@dub/utils";
import { Prisma } from "@prisma/client";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";

const RESTRICTED_DOMAINS = DUB_DOMAINS.filter(
  (d) => d.allowedHostnames.length > 0,
).map((d) => d.slug);

async function main() {
  console.log(
    `Looking for links on [${RESTRICTED_DOMAINS.join(", ")}] with targeting configured...`,
  );

  let totalCleared = 0;

  while (true) {
    const links = await prisma.link.findMany({
      where: {
        domain: { in: RESTRICTED_DOMAINS },
        OR: [
          { ios: { not: null } },
          { android: { not: null } },
          { geo: { not: Prisma.DbNull } },
          { testVariants: { not: Prisma.DbNull } },
        ],
      },
      select: {
        id: true,
        domain: true,
        key: true,
        ios: true,
        android: true,
        geo: true,
        testVariants: true,
      },
      take: 500,
    });

    if (links.length === 0) {
      console.log("No more links to clean up. Exiting...");
      break;
    }

    console.table(
      links.map((link) => ({
        id: link.id,
        domain: link.domain,
        key: link.key,
        ios: Boolean(link.ios),
        android: Boolean(link.android),
        geo: Boolean(link.geo),
        testVariants: Boolean(link.testVariants),
      })),
    );

    const { count } = await prisma.link.updateMany({
      where: {
        id: { in: links.map((link) => link.id) },
      },
      data: {
        ios: null,
        android: null,
        geo: Prisma.DbNull,
        testVariants: Prisma.DbNull,
        testStartedAt: null,
        testCompletedAt: null,
      },
    });

    console.log(`Cleared targeting fields on ${count} links`);
    totalCleared += count;

    const res = await linkCache.expireMany(links);
    console.log("Expired Redis cache:", res);
  }

  console.log(`Done. Cleared targeting on ${totalCleared} links total.`);
}

main();
