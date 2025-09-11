import { includeTags } from "@/lib/api/links/include-tags";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

const take = 1 // 1000;

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
      },
      include: {
        ...includeTags,
        programEnrollment: {
          select: {
            groupId: true,
          },
        },
      },
      orderBy: {
        id: "asc",
      },
      take,
      skip: cursor ? 1 : 0,
      ...(cursor
        ? {
            cursor: {
              id: cursor,
            },
          }
        : {}),
    });

    if (links.length === 0) {
      console.log("No more links to process.");
      break;
    }

    console.log(`Found ${links.length} links to process.`);

    cursor = links[links.length - 1].id;

    const { successful_rows, quarantined_rows } = await recordLink(
      links.map((link) => ({
        ...link,
        partnerGroupId: link.programEnrollment?.groupId,
      })),
    );

    if (successful_rows !== links.length) {
      console.log(`Failed to record ${links.length - successful_rows} links.`);
    }

    if (quarantined_rows !== 0) {
      console.log(`Quarantined ${quarantined_rows} links.`);
    }
  }
}

main();
