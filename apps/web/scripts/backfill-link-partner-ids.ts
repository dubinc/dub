import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { includeTags } from "../lib/api/links/include-tags";
import { recordLink } from "../lib/tinybird";

// script to backfill tenantIds and partnerIds to dub_links_metadata in TB
async function main() {
  const links = await prisma.link.findMany({
    where: {
      partnerId: {
        not: null,
      },
    },
    include: includeTags,
  });

  console.log(links.length);

  await recordLink(links);
}

main();
