import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@dub/email";
import ProgramImported from "@dub/email/templates/program-imported";
import { tapfiliateImporter } from "./importer";
import { TapfiliateImportPayload } from "./types";

const PARTNER_IDS_PER_BATCH = 100;

// Remove partners with no leads and clean up orphaned partners
export async function cleanupPartners(payload: TapfiliateImportPayload) {
  const { programId, userId, importId } = payload;

  let hasMore = true;
  let start = 0;

  while (hasMore) {
    const partnerIds = await tapfiliateImporter.listImportedPartnerIds({
      programId,
      start,
      end: start + PARTNER_IDS_PER_BATCH - 1,
    });

    if (partnerIds.length === 0) {
      hasMore = false;
      break;
    }

    const links = await prisma.link.groupBy({
      by: ["programId", "partnerId"],
      where: {
        programId,
        partnerId: {
          in: partnerIds,
        },
      },
      _sum: {
        leads: true,
      },
    });

    const linksWithNoLeads = links.filter((link) => link._sum.leads === 0);

    const partnerIdsWithNoLeads = linksWithNoLeads
      .map((link) => link.partnerId)
      .filter((partnerId): partnerId is string => partnerId !== null);

    if (partnerIdsWithNoLeads.length > 0) {
      const linksToDelete = await prisma.link.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsWithNoLeads,
          },
        },
      });

      await bulkDeleteLinks(linksToDelete);

      // Resolved before the delete, since nothing can map these partners back
      // to their enrollments afterwards.
      const removedEnrollments = await prisma.programEnrollment.findMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsWithNoLeads,
          },
        },
        select: {
          id: true,
        },
      });

      await prisma.programEnrollment.deleteMany({
        where: {
          programId,
          partnerId: {
            in: partnerIdsWithNoLeads,
          },
        },
      });

      // Queue an index update because the enrollments were deleted.
      await queuePartnerSearchSync({
        enrollmentIds: removedEnrollments.map(({ id }) => id),
      });

      // Remove partners that are not enrolled in any other program
      const otherProgramEnrollments = await prisma.programEnrollment.findMany({
        where: {
          partnerId: {
            in: partnerIdsWithNoLeads,
          },
          programId: {
            not: programId,
          },
        },
        select: {
          partnerId: true,
        },
      });

      const enrolledPartnerIds = otherProgramEnrollments.map(
        ({ partnerId }) => partnerId,
      );

      // Find partners that are not enrolled in any other program
      const removablePartnerIds = partnerIdsWithNoLeads.filter(
        (partnerId) => !enrolledPartnerIds.includes(partnerId),
      );

      // Find partners that have no user account
      if (removablePartnerIds.length > 0) {
        const partnersWithoutUserAccount = await prisma.partner.findMany({
          where: {
            id: {
              in: removablePartnerIds,
            },
            users: {
              none: {},
            },
          },
          select: {
            id: true,
            email: true,
          },
        });

        if (partnersWithoutUserAccount.length > 0) {
          await prisma.partner.deleteMany({
            where: {
              id: {
                in: partnersWithoutUserAccount.map(({ id }) => id),
              },
            },
          });
        }
      }
    }

    start += PARTNER_IDS_PER_BATCH;
  }

  await tapfiliateImporter.clearImportedPartnerIds(programId);

  // Import is finished, send the email to the workspace user
  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    select: {
      name: true,
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!program) {
    console.error(`Program ${programId} not found.`);
    return;
  }

  const workspaceUser = await prisma.projectUsers.findUniqueOrThrow({
    where: {
      userId_projectId: {
        userId,
        projectId: program.workspace.id,
      },
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workspaceUser && workspaceUser.user.email) {
    await sendEmail({
      to: workspaceUser.user.email,
      subject: "Tapfiliate program imported",
      react: ProgramImported({
        email: workspaceUser.user.email,
        workspace: program.workspace,
        program,
        provider: "Tapfiliate",
        importId,
      }),
      headers: {
        "Idempotency-Key": importId,
      },
    });
  }
}
