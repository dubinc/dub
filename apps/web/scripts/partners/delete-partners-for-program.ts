import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const programId = "prog_";

async function main() {
  const currentProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      programId,
    },
    include: {
      links: true,
    },
    take: 500,
  });

  const otherProgramEnrollments = await prisma.programEnrollment.findMany({
    where: {
      partnerId: {
        in: currentProgramEnrollments.map((p) => p.partnerId),
      },
      programId: {
        not: programId,
      },
    },
  });

  console.log({
    currentProgramEnrollments: currentProgramEnrollments.length,
    otherProgramEnrollments: otherProgramEnrollments.length,
  });

  const finalPartnersToDelete = currentProgramEnrollments.filter(
    // make sure partner is not enrolled in any other program
    // make sure the sum of all links' leads count is 0
    (p) =>
      otherProgramEnrollments.every((o) => o.partnerId !== p.partnerId) &&
      p.links.reduce((acc, link) => acc + link.leads, 0) === 0,
  );

  console.log("finalPartnersToDelete", finalPartnersToDelete.length);

  await bulkDeleteLinks(finalPartnersToDelete.flatMap((p) => p.links));

  const deletePartners = await prisma.partner.deleteMany({
    where: {
      id: {
        in: finalPartnersToDelete.map((p) => p.partnerId),
      },
    },
  });

  console.log("deletePartners", deletePartners);
}

main();
