import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const batchSize = 500;
  let processedCount = 0;

  while (true) {
    const links = await prisma.link.findMany({
      where: {
        shortLink: null,
      },
      select: {
        id: true,
        domain: true,
        key: true,
      },
      take: batchSize,
    });

    if (links.length === 0) {
      break;
    }

    const results = await Promise.allSettled(
      links.map((link) =>
        prisma.link.update({
          where: { id: link.id },
          data: {
            shortLink: `https://${link.domain}/${link.key}`,
          },
        }),
      ),
    );

    processedCount += results.filter((r) => r.status === "fulfilled").length;
    console.log(`Processed ${processedCount} links`);
  }

  console.log("Backfill complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
