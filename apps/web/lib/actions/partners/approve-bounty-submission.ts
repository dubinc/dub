"use server";

import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { BountySubmissionSchema } from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import BountyApproved from "@dub/email/templates/bounty-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  submissionId: z.string(),
  rewardAmount: z.number().nullable(),
});

// Approve a submission for a bounty
export const approveBountySubmissionAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    const { submissionId, rewardAmount } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { program, bounty, partner, ...bountySubmission } =
      await prisma.bountySubmission.findUniqueOrThrow({
        where: {
          id: submissionId,
        },
        include: {
          program: true,
          bounty: true,
          partner: true,
        },
      });

    if (bountySubmission.programId !== programId) {
      throw new Error("Bounty submission does not belong to this program.");
    }

    if (bountySubmission.status === "approved") {
      throw new Error("Bounty submission already approved.");
    }

    if (bounty.type === "performance") {
      throw new Error("Performance based bounties cannot be approved.");
    }

    // Find the reward amount
    const finalRewardAmount = bounty.rewardAmount ?? rewardAmount;

    if (!finalRewardAmount) {
      throw new Error(
        "Reward amount is required to approve the bounty submission.",
      );
    }

    const commission = await createPartnerCommission({
      event: "custom",
      partnerId: bountySubmission.partnerId,
      programId: bountySubmission.programId,
      amount: finalRewardAmount,
      quantity: 1,
      user,
      description: `Commission for successfully completed "${bounty.name}" bounty.`,
    });

    if (!commission) {
      throw new Error("Failed to create commission for the bounty submission.");
    }

    await prisma.bountySubmission.update({
      where: {
        id: submissionId,
      },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        userId: user.id,
        rejectionNote: null,
        rejectionReason: null,
        commissionId: commission.id,
      },
    });

    waitUntil(
      Promise.allSettled([
        recordAuditLog({
          workspaceId: workspace.id,
          programId: program.id,
          action: "bounty_submission.approved",
          description: `Bounty submission approved for ${partner.id}`,
          actor: user,
          targets: [
            {
              type: "bounty_submission",
              id: submissionId,
              metadata: BountySubmissionSchema.parse(bountySubmission),
            },
          ],
        }),

        partner.email &&
          sendEmail({
            subject: "Bounty approved!",
            to: partner.email,
            variant: "notifications",
            react: BountyApproved({
              email: partner.email,
              program: {
                name: program.name,
                slug: program.slug,
              },
              bounty: {
                name: bounty.name,
                type: bounty.type,
              },
            }),
          }),
      ]),
    );
  });
