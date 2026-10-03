import { recordAuditLog } from "@/lib/api/audit-logs/record-audit-log";
import { DubApiError } from "@/lib/api/errors";
import { Session } from "@/lib/auth";
import {
  buildMilestonesCommissionDescription,
  getPendingSocialMetricsMilestones,
  getSocialMetricsEarningCap,
} from "@/lib/bounty/social-metrics-milestones";
import { resolveBountyDetails } from "@/lib/bounty/utils";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { prisma } from "@/lib/prisma";
import {
  approveBountySubmissionBodySchema,
  BountySubmissionSchema,
} from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import BountyApproved from "@dub/email/templates/bounty-approved";
import { nFormatter } from "@dub/utils";
import {
  BountySubmissionStatus,
  CommissionSource,
  Prisma,
} from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import * as z from "zod/v4";

interface ApproveBountySubmissionParams
  extends z.infer<typeof approveBountySubmissionBodySchema> {
  programId: string;
  bountyId?: string;
  submissionId: string;
  user: Session["user"];
}

const submissionApprovalInclude = {
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
} satisfies Prisma.BountySubmissionInclude;

type ApprovedSubmission = Prisma.BountySubmissionGetPayload<{
  include: typeof submissionApprovalInclude;
}>;

const submissionApprovalSelect = {
  programId: true,
  partnerId: true,
  bountyId: true,
  status: true,
  socialMetricCount: true,
  approvedSocialMetricThreshold: true,
  bounty: {
    select: {
      name: true,
      type: true,
      rewardAmount: true,
      submissionRequirements: true,
    },
  },
} satisfies Prisma.BountySubmissionSelect;

type SubmissionToApprove = Prisma.BountySubmissionGetPayload<{
  select: typeof submissionApprovalSelect;
}>;

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
    select: submissionApprovalSelect,
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
  const bountyInfo = resolveBountyDetails(bounty);

  // If the bounty has social metrics, approve the milestones
  if (bountyInfo?.socialMetrics) {
    return approveSocialMetricsMilestones({
      submissionId,
      submission,
      metric: bountyInfo.socialMetrics.metric,
      user,
    });
  }

  const finalRewardAmount = bounty.rewardAmount ?? rewardAmount;

  if (!finalRewardAmount) {
    throw new DubApiError({
      code: "bad_request",
      message: "Reward amount is required to approve the bounty submission.",
    });
  }

  const approvedSubmission = await prisma.bountySubmission
    .update({
      where: {
        id: submissionId,
        status: {
          notIn: [
            BountySubmissionStatus.approved,
            BountySubmissionStatus.draft,
          ],
        },
      },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        userId: user.id,
        rejectionNote: null,
        rejectionReason: null,
      },
      include: submissionApprovalInclude,
    })
    .catch((error) => {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "bad_request",
          message:
            "This bounty submission is no longer awaiting review and cannot be approved.",
        });
      }

      throw error;
    });

  await queuePartnerCommissionCreation({
    event: "custom",
    partnerId: submission.partnerId,
    programId: submission.programId,
    amount: finalRewardAmount,
    quantity: 1,
    userId: user.id,
    source: CommissionSource.user,
    description: `Commission for successfully completing "${bounty.name}" bounty.`,
    bountySubmissionId: submissionId,
  });

  runApprovalSideEffects({
    approvedSubmission,
    bounty,
    user,
    description: `Bounty submission approved for ${approvedSubmission.partner.id}`,
    notifyPartner: true,
  });

  return BountySubmissionSchema.parse(approvedSubmission);
}

async function approveSocialMetricsMilestones({
  submissionId,
  submission,
  metric,
  user,
}: {
  submissionId: string;
  submission: SubmissionToApprove;
  metric: string;
  user: Session["user"];
}) {
  const { bounty } = submission;

  const pendingMilestones = getPendingSocialMetricsMilestones({
    bounty,
    submission,
  });

  const earningCap = getSocialMetricsEarningCap(bounty);

  if (pendingMilestones.length === 0 || earningCap == null) {
    throw new DubApiError({
      code: "bad_request",
      message:
        "The partner hasn't reached a new milestone for this bounty yet, so there is nothing to approve.",
    });
  }

  const firstPendingMilestone = pendingMilestones[0];
  const approvedThreshold =
    pendingMilestones[pendingMilestones.length - 1].threshold;
  const completesEarningCap = approvedThreshold >= earningCap;

  const approvedSubmission = await prisma.bountySubmission
    .update({
      where: {
        id: submissionId,
        approvedSocialMetricThreshold: submission.approvedSocialMetricThreshold,
        status: {
          notIn: [
            BountySubmissionStatus.approved,
            BountySubmissionStatus.draft,
          ],
        },
      },
      data: {
        approvedSocialMetricThreshold: approvedThreshold,
        status: completesEarningCap ? "approved" : "submitted",
        reviewedAt: new Date(),
        userId: user.id,
        rejectionNote: null,
        rejectionReason: null,
      },
      include: submissionApprovalInclude,
    })
    .catch((error) => {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "bad_request",
          message:
            "These milestones have already been approved or the submission is no longer awaiting review.",
        });
      }

      throw error;
    });

  const rewardAmount = pendingMilestones.reduce(
    (sum, { rewardAmount }) => sum + rewardAmount,
    0,
  );

  const description = buildMilestonesCommissionDescription({
    bountyName: bounty.name,
    metric,
    milestone: {
      fromThreshold: firstPendingMilestone.fromThreshold,
      threshold: approvedThreshold,
    },
  });

  await queuePartnerCommissionCreation({
    event: "custom",
    partnerId: submission.partnerId,
    programId: submission.programId,
    amount: rewardAmount,
    quantity: 1,
    userId: user.id,
    source: CommissionSource.user,
    description,
    bountySubmissionId: submissionId,
    metadata: {
      socialMetrics: {
        metric,
        fromThreshold: firstPendingMilestone.fromThreshold,
        threshold: approvedThreshold,
        milestones: pendingMilestones,
      },
    },
  });

  runApprovalSideEffects({
    approvedSubmission,
    bounty,
    user,
    description: completesEarningCap
      ? `Bounty submission approved for ${approvedSubmission.partner.id}`
      : `Bounty milestones approved up to ${nFormatter(approvedThreshold, { full: true })} ${metric} for ${approvedSubmission.partner.id}`,
    notifyPartner: completesEarningCap,
  });

  return BountySubmissionSchema.parse(approvedSubmission);
}

function runApprovalSideEffects({
  approvedSubmission,
  bounty,
  user,
  description,
  notifyPartner,
}: {
  approvedSubmission: ApprovedSubmission;
  bounty: Pick<SubmissionToApprove["bounty"], "name" | "type">;
  user: Session["user"];
  description: string;
  notifyPartner: boolean;
}) {
  const { program, partner } = approvedSubmission;

  waitUntil(
    Promise.allSettled([
      recordAuditLog({
        workspaceId: program.workspaceId,
        programId: program.id,
        action: "bounty_submission.approved",
        description,
        actor: user,
        targets: [
          {
            type: "bounty_submission",
            id: approvedSubmission.id,
            metadata: BountySubmissionSchema.parse(approvedSubmission),
          },
        ],
      }),

      notifyPartner &&
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
}
