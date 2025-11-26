import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";
import { recordLink } from "../../lib/tinybird";

// one time script to restore group ids for banned/deactivated program enrollments
async function main() {
  while (true) {
    const programEnrollmentsToUpdate = await prisma.programEnrollment.findMany({
      where: {
        status: "deactivated",
        groupId: null,
      },
      include: {
        program: {
          select: {
            defaultGroupId: true,
          },
        },
        commissions: {
          take: 1,
          orderBy: {
            createdAt: "desc",
          },
          select: {
            reward: {
              select: {
                leadPartnerGroup: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
      },
      take: 1000,
    });

    if (programEnrollmentsToUpdate.length === 0) {
      break;
    }

    const toUpdate = programEnrollmentsToUpdate.map((p) => ({
      programEnrollmentId: p.id,
      status: p.status,
      groupId:
        p.commissions[0]?.reward?.leadPartnerGroup?.id ??
        p.program.defaultGroupId!,
    }));

    // group by groupId
    const toUpdateGrouped = toUpdate.reduce(
      (acc, p) => {
        acc[p.groupId] = acc[p.groupId] || [];
        acc[p.groupId].push(p.programEnrollmentId);
        return acc;
      },
      {} as Record<string, string[]>,
    );

    for (const [groupId, programEnrollmentIds] of Object.entries(
      toUpdateGrouped,
    )) {
      const res = await prisma.programEnrollment.updateMany({
        where: {
          id: { in: programEnrollmentIds },
        },
        data: { groupId },
      });
      console.log(
        `Updated ${res.count} program enrollments for group ${groupId}`,
      );
    }

    const partnerLinks = await prisma.link.findMany({
      where: {
        programEnrollment: {
          id: {
            in: toUpdate.map((p) => p.programEnrollmentId),
          },
        },
      },
      include: {
        ...includeTags,
        ...includeProgramEnrollment,
      },
    });

    const tbRes = await recordLink(partnerLinks);
    console.log("tbRes", tbRes);
  }
}

main();
