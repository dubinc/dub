import { Session } from "@/lib/auth";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import {
  approveBountySubmissionBodySchema,
  BountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import BountyApproved from "@dub/email/templates/bounty-approved";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";
import { recordAuditLog } from "../audit-logs/record-audit-log";
import { DubApiError } from "../errors";

interface ApproveBountySubmissionParams
  extends z.infer<typeof approveBountySubmissionBodySchema> {
  programId: string;
  bountyId?: string;
  submissionId: string;
  user: Session["user"];
}

export async function approveBountySubmission({
  bountyId,
  programId,
  submissionId,
  rewardAmount,
  user,
}: ApproveBountySubmissionParams) {
  const submission = await prisma.bountySubmission.findUnique({
    where: {
      id: submissionId,
    },
    select: {
      programId: true,
      partnerId: true,
      bountyId: true,
      status: true,
      bounty: {
        select: {
          name: true,
          type: true,
          rewardAmount: true,
        },
      },
    },
  });

  if (!submission) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} not found.`,
    });
  }

  if (submission.programId !== programId) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} does not belong to program ${programId}.`,
    });
  }

  if (bountyId && submission.bountyId !== bountyId) {
    throw new DubApiError({
      code: "not_found",
      message: `Bounty submission ${submissionId} not found for bounty ${bountyId}.`,
    });
  }

  if (submission.status === "draft") {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty submission is in progress and cannot be approved.",
    });
  }

  if (submission.status === "approved") {
    throw new DubApiError({
      code: "bad_request",
      message: "This bounty submission has already been approved.",
    });
  }

  const bounty = submission.bounty;
  const finalRewardAmount = bounty.rewardAmount ?? rewardAmount;

  if (!finalRewardAmount) {
    throw new DubApiError({
      code: "bad_request",
      message: "Reward amount is required to approve the bounty submission.",
    });
  }

  const { commission } = await createPartnerCommission({
    event: "custom",
    partnerId: submission.partnerId,
    programId: submission.programId,
    amount: finalRewardAmount,
    quantity: 1,
    user,
    description: `Commission for successfully completed "${bounty.name}" bounty.`,
  });

  if (!commission) {
    throw new DubApiError({
      code: "internal_server_error",
      message: "Failed to create commission for the bounty submission.",
    });
  }

  const approvedSubmission = await prisma.bountySubmission.update({
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
    include: {
      partner: {
        select: {
          id: true,
          email: true,
        },
      },
      program: {
        select: {
          workspaceId: true,
          id: true,
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
    },
  });

  const { program, partner } = approvedSubmission;

  waitUntil(
    Promise.allSettled([
      recordAuditLog({
        workspaceId: program.workspaceId,
        programId: program.id,
        action: "bounty_submission.approved",
        description: `Bounty submission approved for ${partner.id}`,
        actor: user,
        targets: [
          {
            type: "bounty_submission",
            id: submissionId,
            metadata: BountySubmissionSchema.parse(approvedSubmission),
          },
        ],
      }),

      partner.email &&
        sendEmail({
          subject: "Bounty approved!",
          to: partner.email,
          variant: "notifications",
          replyTo: program.supportEmail || "noreply",
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

  return BountySubmissionSchema.parse(approvedSubmission);
}
