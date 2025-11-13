import { createId } from "@/lib/api/create-id";
import BountyApproved from "@dub/email/templates/bounty-approved";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import "dotenv-flow/config";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";

const userId = "xxx";

// reject invalid bounty submissions
async function main() {
  const bounty = await prisma.bounty.findUniqueOrThrow({
    where: {
      id: "xxx",
    },
  });

  const bountySubmissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId: bounty.id,
      status: "submitted",
    },
    take: 500,
    include: {
      partner: true,
      program: true,
    },
  });

  const validSubmissions = bountySubmissions.filter((submission) => {
    return (submission.urls as string[]).some((url) =>
      url.includes("linkedin.com"),
    );
  });

  console.log(`Found ${validSubmissions.length} valid bounty submissions`);

  const commissionsToCreate = validSubmissions.map((submission) => ({
    id: createId({ prefix: "cm_" }),
    programId: submission.programId,
    partnerId: submission.partnerId,
    userId,
    quantity: 1,
    amount: 0,
    type: "custom",
    earnings: bounty.rewardAmount ?? 0,
    description: `Commission for successfully completed "${bounty.name}" bounty.`,
    createdAt: new Date(),
  })) satisfies Prisma.CommissionCreateManyInput[];

  const commissionRes = await prisma.commission.createMany({
    data: commissionsToCreate,
    skipDuplicates: true,
  });

  console.log(`Created ${commissionRes.count} commissions`);

  const submissionsUpdatedRes = await prisma.bountySubmission.updateMany({
    where: {
      id: {
        in: validSubmissions.map((submission) => submission.id),
      },
    },
    data: {
      status: "approved",
      reviewedAt: new Date(),
      userId,
    },
  });

  console.log(`Updated ${submissionsUpdatedRes.count} submissions`);

  for (const submission of validSubmissions) {
    const commission = commissionsToCreate.find(
      (c) =>
        c.programId === submission.programId &&
        c.partnerId === submission.partnerId,
    );
    if (!commission) {
      console.log(`Commission not found for submission ${submission.id}`);
      continue;
    }

    await Promise.allSettled([
      prisma.bountySubmission.update({
        where: { id: submission.id },
        data: { commissionId: commission.id },
      }),
      syncTotalCommissions({
        partnerId: submission.partnerId,
        programId: submission.programId,
      }),
    ]);
    console.log(
      `Updated submission ${submission.id} to have commission ${commission.id} + synced total commissions`,
    );
  }
  const qstashRes = await queueBatchEmail<typeof BountyApproved>(
    validSubmissions
      .filter((s) => s.partner.email)
      .map((s) => ({
        subject: "Bounty approved!",
        to: s.partner.email!,
        variant: "notifications",
        replyTo: s.program.supportEmail || "noreply",
        templateName: "BountyApproved",
        templateProps: {
          email: s.partner.email!,
          program: {
            name: s.program.name,
            slug: s.program.slug,
          },
          bounty: {
            name: bounty.name,
            type: bounty.type,
          },
        },
      })),
  );
  console.log("qstashRes", qstashRes);
}

main();
