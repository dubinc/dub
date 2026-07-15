import { linkCache } from "@/lib/api/links/cache";
import { includeProgramEnrollment } from "@/lib/api/links/include-program-enrollment";
import { includeTags } from "@/lib/api/links/include-tags";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import { recordLink } from "@/lib/tinybird";
import "dotenv-flow/config";

const DRY_RUN = true;
const EXPECTED_PROGRAM_ID = "";
const PAIRS: { sourceEmail: string; targetEmail: string }[] = [
  // {
  //   sourceEmail: "example@example.com",
  //   targetEmail: "example@example.com",
  // },
];

type SourceAccount = {
  id: string;
  email: string | null;
  programs: { programId: string; tenantId: string | null; status: string }[];
  users: { userId: string }[];
};

// returns a list of reasons the source is NOT a ghost account. Empty list => safe to merge with the
// simple path. Any reason => skip the pair
async function preflightViolations(source: SourceAccount): Promise<string[]> {
  const violations: string[] = [];

  if (source.users.length > 0) {
    violations.push(
      `source has ${source.users.length} linked user(s) — not a ghost (also guards against inverted direction)`,
    );
  }

  if (
    EXPECTED_PROGRAM_ID &&
    source.programs.some(({ programId }) => programId !== EXPECTED_PROGRAM_ID)
  ) {
    const others = source.programs
      .map(({ programId }) => programId)
      .filter((programId) => programId !== EXPECTED_PROGRAM_ID);
    violations.push(
      `source is enrolled in unexpected program(s): ${others.join(", ")}`,
    );
  }

  const [bountySubmissions, partnerRewinds, fraudEvents] = await Promise.all([
    prisma.bountySubmission.count({ where: { partnerId: source.id } }),
    prisma.partnerRewind.count({ where: { partnerId: source.id } }),
    prisma.fraudEvent.count({ where: { partnerId: source.id } }),
  ]);

  if (bountySubmissions > 0) {
    violations.push(`source has ${bountySubmissions} bounty submission(s)`);
  }
  if (partnerRewinds > 0) {
    violations.push(`source has ${partnerRewinds} partner rewind(s)`);
  }
  if (fraudEvents > 0) {
    violations.push(`source has ${fraudEvents} fraud event(s)`);
  }

  return violations;
}

async function mergePair(sourceEmail: string, targetEmail: string) {
  const partnerAccounts = await prisma.partner.findMany({
    where: { email: { in: [sourceEmail, targetEmail] } },
    select: {
      id: true,
      email: true,
      programs: { select: { programId: true, tenantId: true, status: true } },
      users: { select: { userId: true } },
    },
  });

  const source = partnerAccounts.find(
    (p) => p.email?.toLowerCase() === sourceEmail.toLowerCase(),
  );
  const target = partnerAccounts.find(
    (p) => p.email?.toLowerCase() === targetEmail.toLowerCase(),
  );

  if (!source) {
    return { skipped: `source partner ${sourceEmail} not found` };
  }
  if (!target) {
    return { skipped: `target partner ${targetEmail} not found` };
  }
  if (source.id === target.id) {
    return { skipped: `source and target are the same partner` };
  }

  console.log(
    `\n=== Merging ${sourceEmail} (${source.id}) -> ${targetEmail} (${target.id}) ===`,
  );

  const violations = await preflightViolations(source);
  if (violations.length > 0) {
    console.error(`SKIPPING — source is not a ghost account:`);
    violations.forEach((v) => console.error(`  - ${v}`));
    return { skipped: violations.join("; ") };
  }

  if (target.users.length === 0) {
    console.warn(
      `  warning: target ${targetEmail} has 0 linked users too — confirm it is the account to keep`,
    );
  }

  const sourcePartnerId = source.id;
  const targetPartnerId = target.id;
  const sourceEnrollments = source.programs;
  const targetEnrollments = target.programs;

  const newEnrollments = sourceEnrollments.filter(
    ({ programId }) =>
      !targetEnrollments.some((t) => t.programId === programId),
  );
  if (newEnrollments.length > 0) {
    if (DRY_RUN) {
      console.log(
        `[dry] would move ${newEnrollments.length} enrollment(s) to target`,
      );
    } else {
      await prisma.programEnrollment.updateMany({
        where: {
          programId: { in: newEnrollments.map(({ programId }) => programId) },
          partnerId: sourcePartnerId,
        },
        data: { partnerId: targetPartnerId },
      });
    }
  }

  const programIdsToTransfer = sourceEnrollments.map(
    ({ programId }) => programId,
  );
  const payload = {
    where: {
      programId: { in: programIdsToTransfer },
      partnerId: sourcePartnerId,
    },
    data: { partnerId: targetPartnerId },
  };

  if (programIdsToTransfer.length > 0) {
    if (DRY_RUN) {
      const [links, customers, commissions, payouts, discountCodes] =
        await Promise.all([
          prisma.link.count({ where: payload.where }),
          prisma.customer.count({ where: payload.where }),
          prisma.commission.count({ where: payload.where }),
          prisma.payout.count({ where: payload.where }),
          prisma.discountCode.count({ where: payload.where }),
        ]);
      console.log(
        `[dry] would transfer ${links} links, ${customers} customers, ${commissions} commissions, ${payouts} payouts, ${discountCodes} discount codes (+ notification emails, messages, partner comments)`,
      );
    } else {
      const [links, customers, commissions, payouts] = await Promise.all([
        prisma.link.updateMany(payload),
        prisma.customer.updateMany(payload),
        prisma.commission.updateMany(payload),
        prisma.payout.updateMany(payload),
      ]);
      console.log(
        `Transferred ${links.count} links, ${customers.count} customers, ${commissions.count} commissions, ${payouts.count} payouts`,
      );

      const [discountCodes, notificationEmails, messages, partnerComments] =
        await Promise.all([
          prisma.discountCode.updateMany(payload),
          prisma.notificationEmail.updateMany(payload),
          prisma.message.updateMany(payload),
          prisma.partnerComment.updateMany(payload),
        ]);
      console.log(
        `Transferred ${discountCodes.count} discount codes, ${notificationEmails.count} notification emails, ${messages.count} messages, ${partnerComments.count} partner comments`,
      );

      const updatedLinks = await prisma.link.findMany({
        where: {
          programId: { in: programIdsToTransfer },
          partnerId: targetPartnerId,
        },
        include: { ...includeTags, ...includeProgramEnrollment },
      });

      await Promise.allSettled([
        recordLink(updatedLinks),
        linkCache.expireMany(updatedLinks),
        ...programIdsToTransfer.map((programId) =>
          syncTotalCommissions({ partnerId: targetPartnerId, programId }),
        ),
      ]);
      console.log(
        `Re-recorded ${updatedLinks.length} links in Tinybird + synced total commissions`,
      );
    }
  }

  const existingEnrollments = sourceEnrollments.filter(({ programId }) =>
    targetEnrollments.some((t) => t.programId === programId),
  );
  for (const sourceEnrollment of existingEnrollments) {
    const targetEnrollment = targetEnrollments.find(
      ({ programId }) => programId === sourceEnrollment.programId,
    );
    if (DRY_RUN) {
      console.log(
        `[dry] would drop duplicate source enrollment for program ${sourceEnrollment.programId}`,
      );
      continue;
    }
    await prisma.$transaction(async (tx) => {
      if (
        targetEnrollment &&
        sourceEnrollment.status === "approved" &&
        ["pending", "invited"].includes(targetEnrollment.status)
      ) {
        await tx.programEnrollment.update({
          where: {
            partnerId_programId: {
              partnerId: targetPartnerId,
              programId: sourceEnrollment.programId,
            },
          },
          data: { status: "approved" },
        });
      }
      await tx.programEnrollment.delete({
        where: {
          partnerId_programId: {
            partnerId: sourcePartnerId,
            programId: sourceEnrollment.programId,
          },
        },
      });
      if (sourceEnrollment.tenantId && !targetEnrollment?.tenantId) {
        await tx.programEnrollment.update({
          where: {
            partnerId_programId: {
              partnerId: targetPartnerId,
              programId: sourceEnrollment.programId,
            },
          },
          data: { tenantId: sourceEnrollment.tenantId },
        });
      }
    });
  }

  // finally, delete the source partner (raw delete, matching the cron)
  if (DRY_RUN) {
    console.log(`[dry] would delete source partner ${sourcePartnerId}`);
  } else {
    await conn.execute(`DELETE FROM Partner WHERE id = ?`, [sourcePartnerId]);
    console.log(`Deleted source partner ${sourceEmail} (${sourcePartnerId})`);
  }

  return { merged: true };
}

async function main() {
  console.log(
    DRY_RUN
      ? "DRY RUN – no changes will be written (set DRY_RUN = false to apply)"
      : "LIVE RUN – changes will be written",
  );
  if (!EXPECTED_PROGRAM_ID) {
    console.warn(
      "warning: EXPECTED_PROGRAM_ID is empty — the program-scope guard is disabled",
    );
  }

  const skipped: { pair: string; reason: string }[] = [];
  let mergedCount = 0;

  for (const { sourceEmail, targetEmail } of PAIRS) {
    try {
      const result = await mergePair(sourceEmail, targetEmail);
      if (result.skipped) {
        skipped.push({
          pair: `${sourceEmail} -> ${targetEmail}`,
          reason: result.skipped,
        });
      } else {
        mergedCount++;
      }
    } catch (error) {
      console.error(`Failed to merge ${sourceEmail} -> ${targetEmail}:`, error);
      skipped.push({
        pair: `${sourceEmail} -> ${targetEmail}`,
        reason: `error: ${(error as Error).message}`,
      });
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`${DRY_RUN ? "Would merge" : "Merged"}: ${mergedCount} pair(s)`);
  if (skipped.length > 0) {
    console.log(`Skipped: ${skipped.length} pair(s)`);
    skipped.forEach(({ pair, reason }) =>
      console.log(`  - ${pair}: ${reason}`),
    );
  }
}

main();
