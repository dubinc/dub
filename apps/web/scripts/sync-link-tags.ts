import "dotenv-flow/config";
import prisma from "@/lib/prisma";

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

  const all = await Promise.allSettled(
    links.map(async (link) => {
      if (link.tagId == null) return;

      await prisma.link.update({
        where: {
          id: link.id,
        },
        data: {
          tags: {
            create: {
              tagId: link.tagId,
            },
          },
        },
      });
    }),
  );

  const updated = all.filter(({ status }) => status === "fulfilled");

  console.log(`Updated ${updated.length} / ${links.length} links.`);
}

main();
