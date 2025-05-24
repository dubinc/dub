import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

/*

  One time script to analyze links that are associated with multiple webhooks.

  Also analyze projects that those links belong to.

*/

async function main() {
  const linkWebhooks = await prisma.linkWebhook.groupBy({
    by: ["linkId"],
    _count: true,
  });

  // order by _count desc
  const sortedLinkWebhooks = linkWebhooks
    .filter((l) => l._count > 1)
    .sort((a, b) => b._count - a._count);

  console.table(sortedLinkWebhooks);
  console.log(
    `Found ${sortedLinkWebhooks.length} links with multiple webhooks`,
  );

  const links = await prisma.link.groupBy({
    by: ["projectId"],
    where: {
      id: {
        in: sortedLinkWebhooks.map((l) => l.linkId),
      },
    },
    _count: true,
  });

  console.table(links);
  console.log(`Found ${links.length} projects with multiple links webhooks`);
}

main();
