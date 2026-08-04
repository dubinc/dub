import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const BATCH_SIZE = 500;

async function main() {
  let totalProcessed = 0;

  while (true) {
    const links = await prisma.link.findMany({
      where: {
        programId: { not: null },
        partnerId: { not: null },
        comments: { not: null },
        partnerLinkComments: null,
        NOT: {
          comments: "",
        },
      },
      select: {
        id: true,
        comments: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (links.length === 0) {
      break;
    }

    await Promise.all(
      links.map(({ id, comments }) =>
        prisma.link.update({
          where: { id },
          data: { partnerLinkComments: comments },
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
