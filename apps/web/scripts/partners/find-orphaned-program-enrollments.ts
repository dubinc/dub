import { bulkDeleteLinks } from "@/lib/api/links/bulk-delete-links";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Finds program enrollments whose partner no longer exists and deletes them by ID,
// together with their customers and links.
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

  let deletedCount = 0;

  // one enrollment at a time, since bulkDeleteLinks expects links from a single workspace
  for (const programEnrollment of orphanedProgramEnrollments) {
    await deleteOrphanedProgramEnrollment(programEnrollment);
    deletedCount++;
  }

  console.log(
    `Deleted ${deletedCount} of ${orphanedProgramEnrollments.length} orphaned program enrollments.`,
  );
}

async function deleteOrphanedProgramEnrollment({
  id,
  partnerId,
  programId,
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

  await prisma.programEnrollment.delete({
    where: {
      id,
    },
  });
}

main();
