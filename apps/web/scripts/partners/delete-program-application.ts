import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: {
      id: "pn_xxx",
    },
    include: {
      programs: {
        select: {
          id: true,
          applicationId: true,
        },
      },
    },
  });

  const programEnrollment = partner.programs[0];

  const deleteProgramEnrollment = await prisma.programEnrollment.delete({
    where: {
      id: programEnrollment.id,
    },
  });

  console.log("Deleted program enrollment", deleteProgramEnrollment);

  // Queue an index update for the deleted enrollment.
  await queuePartnerSearchSync({ enrollmentIds: [programEnrollment.id] });

  if (programEnrollment.applicationId) {
    const deleteProgramApplication = await prisma.programApplication.delete({
      where: {
        id: programEnrollment.applicationId,
      },
    });

    console.log("Deleted program application", deleteProgramApplication);
  }
}

main();
