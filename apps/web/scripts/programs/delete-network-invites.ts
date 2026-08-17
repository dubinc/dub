import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

async function main() {
  const discoveredPartners = await prisma.discoveredPartner.findMany({
    where: {
      program: {
        workspace: {
          plan: {
            notIn: ["advanced", "enterprise"],
          },
        },
      },
      programEnrollment: {
        status: "invited",
      },
    },
    include: {
      program: true,
      partner: true,
      programEnrollment: {
        include: {
          links: true,
        },
      },
    },
  });

  console.table(
    discoveredPartners.map(({ program, partner }) => ({
      program: program?.slug,
      partner: partner?.email,
    })),
  );

  // Delete per enrollment so each bulkDeleteLinks call stays single-workspace
  for (const { programEnrollment } of discoveredPartners) {
    const links = programEnrollment?.links ?? [];

    if (links.length > 0) {
      await bulkDeleteLinks(links);
    }
  }

  const enrollmentIds = discoveredPartners
    .map(({ programEnrollment }) => programEnrollment?.id)
    .filter((id): id is string => Boolean(id));

  const res2 = await prisma.$transaction([
    prisma.discoveredPartner.deleteMany({
      where: {
        id: {
          in: discoveredPartners.map((i) => i.id),
        },
      },
    }),

    prisma.programEnrollment.deleteMany({
      where: {
        id: {
          in: enrollmentIds,
        },
      },
    }),
  ]);

  console.log("res2", res2);

  // Queue an index update for the deleted enrollments.
  await queuePartnerSearchSync({ enrollmentIds });
}

main();
