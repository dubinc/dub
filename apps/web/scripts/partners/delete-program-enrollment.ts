import { deleteLinks } from "@/lib/api/links/delete-links";
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

  await deleteLinks(programEnrollment.links);

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
}

main();
