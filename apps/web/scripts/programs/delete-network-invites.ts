import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../lib/api/links/bulk-delete-links";

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

  const linksToDelete = discoveredPartners.flatMap(
    ({ programEnrollment }) => programEnrollment?.links ?? [],
  );

  const res = await Promise.allSettled([
    prisma.link.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    }),

    bulkDeleteLinks(linksToDelete),
  ]);

  console.log("res", res);

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
          in: discoveredPartners.map((i) => i.programEnrollment?.id!),
        },
      },
    }),
  ]);

  console.log("res2", res2);
}

main();
