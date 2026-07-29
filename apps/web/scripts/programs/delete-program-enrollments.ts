import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

const programId = "prog_xxx";

async function main() {
  while (true) {
    const programEnrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        totalLeads: 0,
      },
      take: 250,
      include: {
        links: true,
      },
    });

    if (programEnrollments.length === 0) {
      console.log("No program enrollments found");
      break;
    }

    const linksToDelete = programEnrollments.flatMap(({ links }) => links);

    // in case some of the links actually do have leads
    if (linksToDelete.some(({ leads }) => leads > 0)) {
      console.log(
        `Found links with leads: ${linksToDelete
          .filter(({ leads }) => leads > 0)
          .map(({ shortLink }) => shortLink)
          .join(", ")}`,
      );
      break;
    }

    await bulkDeleteLinks(linksToDelete);

    const deleteProgramEnrollment = await prisma.programEnrollment.deleteMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
    });

    console.log("deleteProgramEnrollment", deleteProgramEnrollment);
  }
}

main();
