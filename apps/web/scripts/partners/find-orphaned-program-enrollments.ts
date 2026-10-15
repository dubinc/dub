import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { queuePartnerSearchSync } from "@/lib/api/partners/queue-partner-search-sync";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Finds program enrollments whose partner no longer exists and deletes them by ID,
// together with their customers, links, commissions, payouts and other related rows
// (the same rows bulkDeletePartners deletes for Acme enrollments).
// This can happen because the schema uses relationMode = "prisma" (no DB-level
// foreign keys), so raw SQL deletes of Partner rows (e.g. bulkDeletePartners)
// don't cascade to ProgramEnrollment.
//
// Usage: pnpm script partners/find-orphaned-program-enrollments
// Set DRY_RUN to false to delete the orphaned enrollments.

const DRY_RUN = true;

type OrphanedProgramEnrollment = {
  id: string;
  partnerId: string;
  programId: string;
  programSlug: string | null;
  workspaceId: string | null;
  status: string;
  createdAt: Date;
};

async function main() {
  const orphanedProgramEnrollments = await prisma.$queryRaw<
    OrphanedProgramEnrollment[]
  >`
    SELECT
      pe.id,
      pe.partnerId,
      pe.programId,
      pr.slug AS programSlug,
      pr.workspaceId,
      pe.status,
      pe.createdAt
    FROM ProgramEnrollment pe
    LEFT JOIN Partner p ON p.id = pe.partnerId
    LEFT JOIN Program pr ON pr.id = pe.programId
    WHERE p.id IS NULL
    ORDER BY pe.createdAt DESC
  `;

  console.log(
    `Found ${orphanedProgramEnrollments.length} program enrollments without a partner.`,
  );

  if (orphanedProgramEnrollments.length === 0) {
    return;
  }

  console.table(
    orphanedProgramEnrollments.map((pe) => ({
      id: pe.id,
      partnerId: pe.partnerId,
      program: pe.programSlug ?? pe.programId,
      status: pe.status,
      createdAt: pe.createdAt,
    })),
  );

  const countByProgram = orphanedProgramEnrollments.reduce<
    Record<string, number>
  >((acc, pe) => {
    const key = pe.programSlug ?? pe.programId;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  console.log("Orphaned enrollments by program:");
  console.table(countByProgram);

  if (DRY_RUN) {
    console.log("DRY_RUN is enabled, skipping deletion.");
    return;
  }

  const deletedEnrollmentIds: string[] = [];

  try {
    // one enrollment at a time, since bulkDeleteLinks expects links from a single workspace
    for (const programEnrollment of orphanedProgramEnrollments) {
      await deleteOrphanedProgramEnrollment(programEnrollment);
      deletedEnrollmentIds.push(programEnrollment.id);
    }
  } finally {
    // the sync job removes enrollments it cannot read back from the search index.
    // Runs on failure too, so enrollments deleted before the error are synced.
    await queuePartnerSearchSync({
      enrollmentIds: deletedEnrollmentIds,
    });

    console.log(
      `Deleted ${deletedEnrollmentIds.length} of ${orphanedProgramEnrollments.length} orphaned program enrollments.`,
    );
  }
}

async function deleteOrphanedProgramEnrollment({
  id,
  partnerId,
  programId,
  workspaceId,
}: OrphanedProgramEnrollment) {
  console.log(`Deleting program enrollment ${id}`);

  const links = await prisma.link.findMany({
    where: {
      programId,
      partnerId,
    },
  });

  if (links.length > 0) {
    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        linkId: {
          in: links.map((link) => link.id),
        },
      },
    });
    console.log(`Deleted ${deletedCustomers.count} customers`);

    const { deletedCount } = await bulkDeleteLinks(links);
    console.log(`Deleted ${deletedCount} links`);
  }

  const commissions = await prisma.commission.findMany({
    where: {
      programId,
      partnerId,
    },
    select: {
      id: true,
    },
  });

  if (commissions.length > 0) {
    const commissionIds = commissions.map((commission) => commission.id);

    const deletedCommissions = await prisma.commission.deleteMany({
      where: {
        id: {
          in: commissionIds,
        },
      },
    });
    console.log(`Deleted ${deletedCommissions.count} commissions`);

    const deletedActivityLogsForCommissions =
      await prisma.activityLog.deleteMany({
        where: {
          resourceType: "commission",
          resourceId: {
            in: commissionIds,
          },
        },
      });
    console.log(
      `Deleted ${deletedActivityLogsForCommissions.count} activity logs for commissions`,
    );
  }

  const deletedPayouts = await prisma.payout.deleteMany({
    where: {
      programId,
      partnerId,
    },
  });
  console.log(`Deleted ${deletedPayouts.count} payouts`);

  const deletedMessages = await prisma.message.deleteMany({
    where: {
      programId,
      partnerId,
    },
  });
  console.log(`Deleted ${deletedMessages.count} messages`);

  const deletedBountySubmissions = await prisma.bountySubmission.deleteMany({
    where: {
      programId,
      partnerId,
    },
  });
  console.log(`Deleted ${deletedBountySubmissions.count} bounty submissions`);

  const deletedActivityLogs = await prisma.activityLog.deleteMany({
    where: {
      programId,
      resourceType: "partner",
      resourceId: partnerId,
    },
  });
  console.log(`Deleted ${deletedActivityLogs.count} activity logs`);

  // in one transaction, so a failed decrement cannot leave partnersUsage too high
  // after the enrollment is gone and the next run can no longer find it
  await prisma.$transaction([
    prisma.programEnrollment.delete({
      where: {
        id,
      },
    }),
    ...(workspaceId
      ? [
          prisma.project.update({
            where: {
              id: workspaceId,
            },
            data: {
              partnersUsage: {
                decrement: 1,
              },
            },
          }),
        ]
      : []),
  ]);
}

main();
