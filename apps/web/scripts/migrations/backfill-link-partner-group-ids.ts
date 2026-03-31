import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const LINKS_PER_BATCH = 1000;
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

    if (links.length === 0) {
      console.log("No links found, skipping...");
      break;
    }

    console.log(`Found ${links.length} links to process.`);

    cursor = links[links.length - 1].id;

    const linksWithGroupIds = links.filter(
      (link) => link.programEnrollment?.groupId,
    );

    if (linksWithGroupIds.length === 0) {
      console.log("No links with group ids found, skipping...");
      break;
    }

    const { successful_rows, quarantined_rows } =
      await recordLink(linksWithGroupIds);

    if (successful_rows !== linksWithGroupIds.length) {
      console.log(
        `Failed to record ${linksWithGroupIds.length - successful_rows} links.`,
      );
    }

    if (quarantined_rows !== 0) {
      console.log(`Quarantined ${quarantined_rows} links.`);
    }
  }
}

main();
