import { createId } from "@/lib/api/create-id";
import BountyApproved from "@dub/email/templates/bounty-approved";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { chunk } from "@dub/utils";
import "dotenv-flow/config";
import { syncTotalCommissions } from "../../lib/api/partners/sync-total-commissions";
import { queueBatchEmail } from "../../lib/email/queue-batch-email";

const userId = "user_xxx";

// approve bounty submissions
async function main() {
  const bounty = await prisma.bounty.findUniqueOrThrow({
    where: {
      id: "bnty_xxx",
    },
  });

  const bountySubmissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId: bounty.id,
      status: "submitted",
    },
    take: 1000,
    include: {
      partner: true,
      program: true,
    },
  });

  console.log(`Found ${bountySubmissions.length} bounty submissions`);

  const commissionsToCreate = bountySubmissions.map((submission) => ({
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
        in: bountySubmissions.map((submission) => submission.id),
      },
    },
    data: {
      status: "approved",
      reviewedAt: new Date(),
      userId,
    },
  });

  console.log(`Updated ${submissionsUpdatedRes.count} submissions`);

  const chunks = chunk(bountySubmissions, 50);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    await Promise.allSettled(
      chunk.map(async (submission) => {
        const commission = commissionsToCreate.find(
          (c) =>
            c.programId === submission.programId &&
            c.partnerId === submission.partnerId,
        );
        if (!commission) {
          console.log(`Commission not found for submission ${submission.id}`);
          return;
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
      }),
    );
    console.log(`Processed chunk ${i + 1} of ${chunks.length}`);
  }

  const qstashRes = await queueBatchEmail<typeof BountyApproved>(
    bountySubmissions.map((s) => ({
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
