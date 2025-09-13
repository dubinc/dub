import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

// Step 2 of 2: Backfill partner links with partnerGroupDefaultLinkId
async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: "acme",
    },
    include: {
      groups: {
        include: {
          partnerGroupDefaultLinks: true,
        },
      },
    },
  });

  for (const group of program.groups) {
    const partnerIds = await prisma.programEnrollment.findMany({
      where: {
        groupId: group.id,
      },
      select: {
        partnerId: true,
      },
    });

    const partnerLinks = await prisma.link.findMany({
      where: {
        programId: program.id,
        partnerId: {
          in: partnerIds.map(({ partnerId }) => partnerId),
        },
        url: program.url!,
      },
      take: 500,
    });

    const res = await prisma.link.updateMany({
      where: {
        id: {
          in: partnerLinks.map(({ id }) => id),
        },
      },
      data: {
        partnerGroupDefaultLinkId: group.partnerGroupDefaultLinks[0].id,
      },
    });

    console.log(
      `Updated ${res.count} links with partnerGroupDefaultLinkId: ${group.partnerGroupDefaultLinks[0].id}`,
    );
  }
}

main();
