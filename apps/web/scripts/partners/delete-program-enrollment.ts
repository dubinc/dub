import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../lib/api/links/bulk-delete-links";

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

  const deleteLinkPrisma = await prisma.link.deleteMany({
    where: {
      id: {
        in: programEnrollment.links.map((l) => l.id),
      },
    },
  });

  console.log("deleteLinkPrisma", deleteLinkPrisma);

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
