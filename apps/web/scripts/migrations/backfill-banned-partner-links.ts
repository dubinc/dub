import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const LINKS_PER_BATCH = 1000;

async function main() {
  let cursor: string | undefined = undefined;

  while (true) {
    // Find links for partners that were banned
    const links = await prisma.link.findMany({
      where: {
        programEnrollment: {
          status: "banned",
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
      orderBy: {
        id: "asc",
      },
      take: LINKS_PER_BATCH,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
    });

    console.log(`Found ${links.length} links to process.`);

    if (links.length === 0) {
      break;
    }

    cursor = links[links.length - 1].id;

    const { successful_rows, quarantined_rows } = await recordLink(links, {
      deleted: true,
    });

    if (successful_rows !== links.length) {
      console.log(`Failed to record ${links.length - successful_rows} links.`);
    }

    if (quarantined_rows !== 0) {
      console.log(`Quarantined ${quarantined_rows} links.`);
    }
  }
}

main();
