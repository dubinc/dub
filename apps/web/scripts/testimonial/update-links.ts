import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { linkCache } from "../../lib/api/links/cache";
import { includeTags } from "../../lib/api/links/include-tags";
import { recordLink } from "../../lib/tinybird";

// update links
async function main() {
  const links = await prisma.link.findMany({
    where: {
      domain: "aff.testimonial.to",
      key: {
        not: "_root",
      },
    },
    include: includeTags,
    take: 500,
  });

  const updatedLinks = await prisma.link.updateMany({
    where: {
      id: {
        in: links.map((link) => link.id),
      },
    },
    data: {
      domain: "refer.testimonial.to",
    },
  });

  console.log(updatedLinks);

  const res = await Promise.all([
    linkCache.expireMany(links),
    recordLink(
      links.map((link) => ({
        ...link,
        domain: "refer.testimonial.to",
      })),
    ),
  ]);

  console.log(res);
}

main();
