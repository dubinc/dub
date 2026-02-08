import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../lib/api/links/bulk-delete-links";

async function main() {
  const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
    where: {
      partnerId_programId: {
        partnerId: "pn_xx",
        programId: "prog_xx",
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

  const deleteProgramEnrollment = await prisma.programEnrollment.delete({
    where: {
      id: programEnrollment.id,
    },
  });

  console.log("deleteProgramEnrollment", deleteProgramEnrollment);
}

main();
