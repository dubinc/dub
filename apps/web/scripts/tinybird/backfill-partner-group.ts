import "dotenv-flow/config";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";

const LINKS_PER_BATCH = 3; // 1000;
const PR_MERGE_TIMESTAMP = new Date("2025-11-07T00:00:00Z");

async function main() {
  let cursor: string | undefined = undefined;

  while (true) {
    // Find the program links
    const links = await prisma.link.findMany({
      where: {
        programId: {
          not: null,
        },
        partnerId: {
          not: null,
        },
        createdAt: {
          lte: PR_MERGE_TIMESTAMP,
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

    const { successful_rows, quarantined_rows } = await recordLink(links);

    if (successful_rows !== links.length) {
      console.log(`Failed to record ${links.length - successful_rows} links.`);
    }

    if (quarantined_rows !== 0) {
      console.log(`Quarantined ${quarantined_rows} links.`);
    }
  }
}

main();
