import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLinkTB, transformLinkTB } from "../lib/tinybird";

async function main() {
  const domain = await prisma.domain.findUniqueOrThrow({
    where: {
      slug: "sms.domain.com",
    },
  });

  if (domain["linkRetentionDays"]) {
    const links = await prisma.link.findMany({
      where: {
        domain: "sms.domain.com",
        createdAt: {
          // 90 days ago
          lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 90),
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 500,
    });

    await Promise.all([
      // Record the links deletion in Tinybird
      // not 100% sure if we need this yet, maybe we should just delete the link completely from TB to save space?
      recordLinkTB(
        links.map((link) => ({
          ...transformLinkTB(link),
          deleted: true,
        })),
      ),
      prisma.link.deleteMany({
        where: {
          id: {
            in: links.map((link) => link.id),
          },
        },
      }),
    ]);

    console.table(links);
  }
}

main();
