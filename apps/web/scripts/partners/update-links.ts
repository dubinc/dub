import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { includeTags } from "../../lib/api/links/include-tags";
import { recordLink } from "../../lib/tinybird";

const oldDomain = "pinnacle-odds-dropper.link";
const newDomain = "go.pinnacleoddsdropper.com";

// update links
async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: oldDomain,
      key: {
        not: "_root",
      },
    },
    include: includeTags,
    take: 100,
  });

  const updatedLinks = await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      domain: newDomain,
    },
  });

  console.log(updatedLinks);

  const res = await Promise.all([
    linkCache.expireMany(links),
    recordLink(
      links.map((link) => ({
        ...link,
        domain: newDomain,
      })),
    ),
  ]);

  await Promise.all(
    links.map(async (link) => {
      return await prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          shortLink: link.shortLink.replace(oldDomain, newDomain),
        },
      });
    }),
  );

  console.log(res);
}

main();
