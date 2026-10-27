import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

// Copies Link.comments into PartnerLinkDetails and keeps them on Link, because
// workspace members can also write Link.comments from the dashboard.
async function main() {
  let totalProcessed = 0;

  while (true) {
    const links = await prisma.link.findMany({
      where: {
        programId: { not: null },
        partnerId: { not: null },
        comments: { not: null },
        // a partner who edited the link before this ran already has a row without comments
        OR: [
          { partnerLinkDetails: null },
          { partnerLinkDetails: { comments: null } },
        ],
        NOT: {
          comments: "",
        },
      },
      select: {
        id: true,
        comments: true,
        partnerLinkDetails: {
          select: {
            id: true,
          },
        },
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (links.length === 0) {
      break;
    }

    const linksWithoutDetails = links.filter(
      ({ partnerLinkDetails }) => !partnerLinkDetails,
    );
    const linksWithDetails = links.filter(
      ({ partnerLinkDetails }) => partnerLinkDetails,
    );

    await prisma.partnerLinkDetails.createMany({
      data: linksWithoutDetails.map(({ id, comments }) => ({
        linkId: id,
        comments,
      })),
    });

    await prisma.$transaction(
      linksWithDetails.map(({ id, comments }) =>
        prisma.partnerLinkDetails.update({
          where: { linkId: id },
          data: { comments },
        }),
      ),
    );

    totalProcessed += links.length;

    console.log(
      `Backfilled ${links.length} partner link comments (processed=${totalProcessed})`,
    );
  }

  console.log(
    `Done backfilling partner link comments (processed=${totalProcessed})`,
  );
}

main();
