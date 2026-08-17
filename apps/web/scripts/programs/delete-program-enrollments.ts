import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { PRISMA_UPDATEMANY_LIMIT } from "@/lib/cron";
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
      take: PRISMA_UPDATEMANY_LIMIT,
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

    const enrollmentIds = programEnrollments.map(({ id }) => id);

    const deleteProgramEnrollment = await prisma.programEnrollment.deleteMany({
      where: {
        id: {
          in: enrollmentIds,
        },
      },
    });

    console.log("deleteProgramEnrollment", deleteProgramEnrollment);

    // Queue an index update for the deleted enrollments.
    await queuePartnerSearchSync({ enrollmentIds });
  }
}

main();
