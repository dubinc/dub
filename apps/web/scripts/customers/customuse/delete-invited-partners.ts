import { prisma } from "@dub/prisma";
import { Link, ProgramEnrollment } from "@dub/prisma/client";
import "dotenv-flow/config";
import { bulkDeleteLinks } from "../../../lib/api/links/bulk-delete-links";

const programId = "prog_1KEVK3M4HD3M7P92DH1VWC7MG";
const BATCH_SIZE = 250;

const dryRun = process.argv.includes("--dry-run");

type EnrollmentWithRelations = ProgramEnrollment & {
  links: Link[];
  programPartnerTags: { partnerTagId: string }[];
};

async function deleteProgramInvite({
  programEnrollment,
  workspaceId,
}: {
  programEnrollment: EnrollmentWithRelations;
  workspaceId: string;
}) {
  if (programEnrollment.totalCommissions > BigInt(0)) {
    throw new Error("Partner has commissions, cannot delete invite.");
  }

  const linksToDelete = programEnrollment.links.filter(
    (link) => link.leads === 0 && link.sales === 0,
  );

  await Promise.allSettled([
    prisma.link.deleteMany({
      where: {
        id: {
          in: linksToDelete.map((link) => link.id),
        },
      },
    }),

    bulkDeleteLinks(
      linksToDelete.map((link) => ({
        ...link,
        programEnrollment: {
          groupId: programEnrollment.groupId,
          programPartnerTags: programEnrollment.programPartnerTags,
        },
      })),
    ),

    prisma.discoveredPartner.deleteMany({
      where: {
        programId: programEnrollment.programId,
        partnerId: programEnrollment.partnerId,
      },
    }),
  ]);

  await prisma.$transaction([
    prisma.programEnrollment.delete({
      where: {
        id: programEnrollment.id,
      },
    }),

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
  ]);
  console.log("Deleted program invite for", programEnrollment.partnerId);
}

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: { id: programId },
    include: { workspace: true },
  });

  const totalInvited = await prisma.programEnrollment.count({
    where: {
      programId,
      status: "invited",
    },
  });

  console.log(
    `Program: ${program.name} (${program.id}) | Workspace: ${program.workspace.name} (${program.workspace.slug})`,
  );
  console.log(`Found ${totalInvited} invited partner enrollments`);
  console.log(dryRun ? "DRY RUN — no changes will be made\n" : "");

  let deleted = 0;
  let skipped = 0;
  let failed = 0;
  const skippedPartnerIds: string[] = [];

  while (true) {
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        programId,
        status: "invited",
        ...(skippedPartnerIds.length > 0 && {
          partnerId: {
            notIn: skippedPartnerIds,
          },
        }),
      },
      include: {
        links: true,
        programPartnerTags: {
          select: {
            partnerTagId: true,
          },
        },
      },
      take: dryRun ? undefined : BATCH_SIZE,
      orderBy: {
        createdAt: "asc",
      },
    });

    if (enrollments.length === 0) {
      break;
    }

    for (const enrollment of enrollments) {
      if (enrollment.totalCommissions > BigInt(0)) {
        skipped++;
        skippedPartnerIds.push(enrollment.partnerId);
        console.log(
          `Skipping ${enrollment.partnerId}: has commissions (${enrollment.totalCommissions})`,
        );
        continue;
      }

      const linksWithActivity = enrollment.links.filter(
        (link) => link.leads > 0 || link.sales > 0,
      );

      if (linksWithActivity.length > 0) {
        console.log(
          `Deleting ${enrollment.partnerId}: keeping ${linksWithActivity.length} link(s) with activity, deleting ${enrollment.links.length - linksWithActivity.length} link(s)`,
        );
      }

      if (dryRun) {
        deleted++;
        continue;
      }

      try {
        await deleteProgramInvite({
          programEnrollment: enrollment,
          workspaceId: program.workspaceId,
        });
        deleted++;
      } catch (error) {
        failed++;
        skippedPartnerIds.push(enrollment.partnerId);
        console.error(
          `Failed to delete invite for ${enrollment.partnerId}:`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    if (dryRun || enrollments.length < BATCH_SIZE) {
      break;
    }
  }

  console.log("\nSummary:");
  console.log(`  Total invited: ${totalInvited}`);
  console.log(`  Deleted:       ${deleted}`);
  console.log(`  Skipped:       ${skipped}`);
  console.log(`  Failed:        ${failed}`);

  if (dryRun) {
    console.log("\nRe-run without --dry-run to execute deletion.");
  }
}

main();
