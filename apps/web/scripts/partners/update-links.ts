import { queuePartnerSearchSyncForLinks } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
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

  // Queued before the cache and Tinybird work below. The helper reads only
  // programId and partnerId, which the move does not touch.
  await queuePartnerSearchSyncForLinks(links);

  const res = await Promise.all([
    linkCache.expireMany(links),
    recordLink(
      links.map((link) => ({
        ...link,
        domain: newDomain,
      })),
    ),
  ]);

  console.log(res);
}

main();
