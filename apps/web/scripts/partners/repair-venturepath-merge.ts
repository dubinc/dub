import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import "dotenv-flow/config";

// Data (links/commissions/customers/payouts) already sits on the target.
// Enrollments never moved. Viktor is the only overlap.

const DRY_RUN = true;

const SOURCE_PARTNER_ID = "pn_xxx";
const TARGET_PARTNER_ID = "pn_xxx";
const VIKTOR_PROGRAM_ID = "prog_xxx";

const SOURCE_EMAIL = "xxx@xxx.com";
const TARGET_EMAIL = "xxx@xxx.com";

const SOURCE_VIKTOR_ENROLLMENT_ID = "pge_xxx";
const TARGET_VIKTOR_ENROLLMENT_ID = "pge_xxx";
const SOURCE_VIKTOR_GROUP_ID = "grp_xxx";
const TARGET_VIKTOR_GROUP_ID = "grp_xxx";

async function moveEnrollmentSideTables({
  programId,
  sourcePartnerId,
  targetPartnerId,
}: {
  programId: string;
  sourcePartnerId: string;
  targetPartnerId: string;
}) {
  const [applicationEvents, submittedLeads, partnerTags] = await Promise.all([
    prisma.programApplicationEvent.updateMany({
      where: { programId, partnerId: sourcePartnerId },
      data: { partnerId: targetPartnerId },
    }),
    prisma.submittedLead.updateMany({
      where: { programId, partnerId: sourcePartnerId },
      data: { partnerId: targetPartnerId },
    }),
    prisma.programPartnerTag.updateMany({
      where: { programId, partnerId: sourcePartnerId },
      data: { partnerId: targetPartnerId },
    }),
  ]);

  console.log(
    `  side tables ${programId}: events=${applicationEvents.count} leads=${submittedLeads.count} tags=${partnerTags.count}`,
  );
}

async function main() {
  const [sourcePartner, targetPartner] = await Promise.all([
    prisma.partner.findUniqueOrThrow({
      where: { id: SOURCE_PARTNER_ID },
      select: { id: true, email: true },
    }),
    prisma.partner.findUniqueOrThrow({
      where: { id: TARGET_PARTNER_ID },
      select: { id: true, email: true },
    }),
  ]);

  if (sourcePartner.email !== SOURCE_EMAIL) {
    throw new Error(
      `Source email mismatch: expected ${SOURCE_EMAIL}, got ${sourcePartner.email}`,
    );
  }

  if (targetPartner.email !== TARGET_EMAIL) {
    throw new Error(
      `Target email mismatch: expected ${TARGET_EMAIL}, got ${targetPartner.email}`,
    );
  }

  const [sourceEnrollments, targetEnrollments] = await Promise.all([
    prisma.programEnrollment.findMany({
      where: { partnerId: SOURCE_PARTNER_ID },
      include: { program: { select: { slug: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.programEnrollment.findMany({
      where: { partnerId: TARGET_PARTNER_ID },
      include: { program: { select: { slug: true } } },
    }),
  ]);

  const sourceViktor = sourceEnrollments.find(
    (enrollment) => enrollment.programId === VIKTOR_PROGRAM_ID,
  );
  const targetViktor = targetEnrollments.find(
    (enrollment) => enrollment.programId === VIKTOR_PROGRAM_ID,
  );

  if (!sourceViktor || sourceViktor.id !== SOURCE_VIKTOR_ENROLLMENT_ID) {
    throw new Error("Source Viktor enrollment not found or id changed.");
  }

  if (
    sourceViktor.status !== "approved" ||
    sourceViktor.groupId !== SOURCE_VIKTOR_GROUP_ID
  ) {
    throw new Error(
      `Source Viktor enrollment is no longer approved Standard (status=${sourceViktor.status}, groupId=${sourceViktor.groupId}).`,
    );
  }

  if (!targetViktor || targetViktor.id !== TARGET_VIKTOR_ENROLLMENT_ID) {
    throw new Error("Target Viktor enrollment not found or id changed.");
  }

  if (
    targetViktor.status !== "pending" ||
    targetViktor.groupId !== TARGET_VIKTOR_GROUP_ID
  ) {
    throw new Error(
      `Target Viktor enrollment is no longer pending Creator Program (status=${targetViktor.status}, groupId=${targetViktor.groupId}).`,
    );
  }

  const otherSourceEnrollments = sourceEnrollments.filter(
    (enrollment) => enrollment.programId !== VIKTOR_PROGRAM_ID,
  );

  const overlappingOthers = otherSourceEnrollments.filter((enrollment) =>
    targetEnrollments.some(
      (target) => target.programId === enrollment.programId,
    ),
  );

  if (overlappingOthers.length > 0) {
    throw new Error(
      `Unexpected extra overlaps: ${overlappingOthers
        .map((enrollment) => enrollment.program.slug)
        .join(", ")}`,
    );
  }

  console.log({
    dryRun: DRY_RUN,
    source: sourcePartner,
    target: targetPartner,
    viktor: {
      deleteTargetEnrollment: {
        id: targetViktor.id,
        status: targetViktor.status,
        groupId: targetViktor.groupId,
      },
      moveSourceEnrollment: {
        id: sourceViktor.id,
        status: sourceViktor.status,
        groupId: sourceViktor.groupId,
        referralRewardId: sourceViktor.referralRewardId,
      },
    },
    otherEnrollmentsToMove: otherSourceEnrollments.map((enrollment) => ({
      id: enrollment.id,
      slug: enrollment.program.slug,
      status: enrollment.status,
    })),
  });

  if (DRY_RUN) {
    console.log("Dry run only. Set DRY_RUN = false to apply.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.programEnrollment.delete({
      where: { id: TARGET_VIKTOR_ENROLLMENT_ID },
    });

    await tx.programEnrollment.update({
      where: { id: SOURCE_VIKTOR_ENROLLMENT_ID },
      data: { partnerId: TARGET_PARTNER_ID },
    });
  });

  await moveEnrollmentSideTables({
    programId: VIKTOR_PROGRAM_ID,
    sourcePartnerId: SOURCE_PARTNER_ID,
    targetPartnerId: TARGET_PARTNER_ID,
  });

  console.log("Moved Viktor Standard enrollment onto the target partner.");

  for (const enrollment of otherSourceEnrollments) {
    await prisma.programEnrollment.update({
      where: { id: enrollment.id },
      data: { partnerId: TARGET_PARTNER_ID },
    });

    await moveEnrollmentSideTables({
      programId: enrollment.programId,
      sourcePartnerId: SOURCE_PARTNER_ID,
      targetPartnerId: TARGET_PARTNER_ID,
    });

    console.log(`Moved ${enrollment.program.slug} (${enrollment.id}).`);
  }

  const programsToSync = [
    VIKTOR_PROGRAM_ID,
    ...otherSourceEnrollments.map((enrollment) => enrollment.programId),
  ];

  for (const programId of programsToSync) {
    await syncTotalCommissions({
      partnerId: TARGET_PARTNER_ID,
      programId,
    });
  }

  const remainingSourceEnrollments = await prisma.programEnrollment.count({
    where: { partnerId: SOURCE_PARTNER_ID },
  });

  if (remainingSourceEnrollments > 0) {
    throw new Error(
      `Source partner still has ${remainingSourceEnrollments} enrollment(s); not deleting.`,
    );
  }

  await conn.execute(`DELETE FROM Partner WHERE id = ?`, [SOURCE_PARTNER_ID]);
  console.log(`Deleted source partner ${SOURCE_PARTNER_ID}.`);
}

main();
