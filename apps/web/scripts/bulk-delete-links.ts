import { recordLinkTB, transformLinkTB } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const domain = "song.fyi";

async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain,
    },
    include: {
      tags: {
        select: {
          tag: true,
        },
      },
    },
    // take: 10000,
  });
  const response = await Promise.allSettled([
    prisma.link.deleteMany({
      where: {
        domain,
        id: {
          in: links.map((link) => link.id),
        },
      },
    }),
    // redis.del(domain),
    recordLinkTB(
      links.map((link) => ({
        ...transformLinkTB(link),
        deleted: true,
      })),
    ),
  ]);

  console.log(links.length);
  console.table(links.slice(-10), ["domain", "key"]);
  console.log(response);
}

main();
