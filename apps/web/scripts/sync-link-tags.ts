import prisma from "@/lib/prisma";
import { DUB_PROJECT_ID } from "@dub/utils";
import "dotenv-flow/config";

/**
 * Propagates LinkTag records for links with tagIds
 */
async function main() {
  // Get all links with Tags but without TagLinks
  const links = await prisma.link.findMany({
    where: {
      tagId: {
        not: null,
      },
      tags: {
        none: {},
      },
    },
  });

  console.log(`Updating ${links.length} links...`);

  const response = await prisma.linkTag.createMany({
    data: links.map((link) => ({
      linkId: link.id,
      tagId: link.tagId!, // cause we filtered out links without tagId
    })),
  });

  console.log(`Created ${response.count} LinkTag records`);
}

main();
