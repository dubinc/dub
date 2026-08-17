import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId: "pn_xxx",
        programId: "prog_xxx",
      },
    },
    include: {
      links: true,
    },
  });

  await bulkDeleteLinks(programEnrollment.links);

  const deletedFraudEvents = await prisma.fraudEvent.deleteMany({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
    },
  });

  console.log("deletedFraudEvents", deletedFraudEvents);

  const deletedFraudEventGroups = await prisma.fraudEventGroup.deleteMany({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
    },
  });

  console.log("deletedFraudEventGroups", deletedFraudEventGroups);

  const deletedMessages = await prisma.message.deleteMany({
    where: {
      programId: programEnrollment.programId,
      partnerId: programEnrollment.partnerId,
    },
  });

  console.log("deletedMessages", deletedMessages);

  const deleteProgramEnrollment = await prisma.programEnrollment.delete({
    where: {
      id: programEnrollment.id,
    },
  });

  console.log("deleteProgramEnrollment", deleteProgramEnrollment);

  // Queue an index update for the deleted enrollment.
  await queuePartnerSearchSync({ enrollmentIds: [programEnrollment.id] });
}

main();
