import { evaluateWorkflowConditions } from "@/lib/api/workflows/evaluate-workflow-conditions";
import {
  bountyEligibilityIncludes,
  canPartnerSubmitBounty,
} from "@/lib/bounty/api/bounty-eligibility";
import { prisma } from "@/lib/prisma";
import {
  WorkflowConditionAttribute,
  WorkflowContextExtended,
} from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail, sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import {
  BountySubmissionStatus,
  Workflow,
  WorkspaceRole,
} from "@prisma/client";
import { createId } from "../create-id";
import { getWorkspaceUsers } from "../get-workspace-users";
import { parseWorkflowConfig } from "./parse-workflow-config";

const terminalStatusReason: Record<
  Exclude<BountySubmissionStatus, "draft">,
  string
> = {
  submitted: "finished",
  approved: "been awarded",
  rejected: "been rejected",
};

export const executeCompleteBountyWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context: WorkflowContextExtended;
}) => {
  const { condition, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.AwardBounty) {
    return;
  }

  const { bountyId } = action.data;
  const { identity, metrics, programEnrollment } = context;
  const { customerId, customerFirstSaleAt } = identity;
  const { programId, partnerId, groupId } = programEnrollment;

  if (!groupId) {
    console.error("Partner groupId not set in the context.");
    return;
  }

  // Find the bounty
  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
    include: {
      submissions: {
        where: {
          partnerId,
        },
        select: {
          id: true,
          status: true,
        },
      },
      program: {
        select: {
          id: true,
          name: true,
          slug: true,
          supportEmail: true,
        },
      },
      ...bountyEligibilityIncludes,
    },
  });

  if (!bounty) {
    console.error(`Bounty ${bountyId} not found.`);
    return;
  }

  if (!bounty.rewardAmount) {
    console.error(`Bounty ${bountyId} has no reward amount.`);
    return;
  }

  // this won't happen as we create workflows for performance based bounties only
  if (bounty.type !== "performance") {
    console.error(`Bounty ${bountyId} is not a performance based bounty.`);
    return;
  }

  const canSubmitBounty = canPartnerSubmitBounty({
    programEnrollment,
    bounty,
  });

  if (!canSubmitBounty) {
    console.log(
      `Partner ${partnerId} is not eligible to submit bounty ${bounty.id}.`,
    );
    return;
  }

  if (bounty.submissions.length > 0) {
    const submission = bounty.submissions[0];

    if (submission.status !== "draft") {
      const reason = terminalStatusReason[submission.status];

      if (reason) {
        console.log(
          `Partner ${partnerId} has already ${reason} this bounty (bountyId: ${bounty.id}, submissionId: ${submission.id}).`,
        );
        return;
      }
    }
  }

  if (
    bounty.startsAt &&
    bounty.performanceScope === "new" &&
    customerFirstSaleAt &&
    customerFirstSaleAt < bounty.startsAt
  ) {
    console.log(
      `Bounty ${bounty.id} is for net-new revenue only and partner ${partnerId} referred customer ${customerId} before the bounty started, skipping...`,
    );
    return;
  }

  console.log(
    `Partner is eligible for bounty ${bounty.id}, executing workflow ${bounty.workflowId}...`,
  );

  const finalContext: Partial<
    Record<WorkflowConditionAttribute, number | null>
  > = {
    totalLeads: metrics?.current?.leads ?? 0,
    totalConversions: metrics?.current?.conversions ?? 0,
    totalSaleAmount: metrics?.current?.saleAmount ?? 0,
    totalCommissions: metrics?.current?.commissions ?? 0,
  };

  const performanceCount = finalContext[condition.attribute] ?? 0;
  const periodNumber = 1; // Only one submission is allowed for performance based bounties

  // Create or update the submission
  const bountySubmission = await prisma.bountySubmission.upsert({
    where: {
      bountyId_partnerId_periodNumber: {
        bountyId,
        partnerId,
        periodNumber,
      },
    },
    create: {
      id: createId({ prefix: "bnty_sub_" }),
      programId,
      partnerId,
      bountyId: bounty.id,
      periodNumber,
      status: "draft",
      performanceCount,
    },
    update: {
      performanceCount: {
        increment: performanceCount,
      },
    },
  });

  // Check if the bounty submission meet the reward criteria
  const shouldExecute = evaluateWorkflowConditions({
    conditions: [condition],
    attributes: {
      [condition.attribute]: Number(bountySubmission.performanceCount ?? 0),
    },
  });

  if (!shouldExecute) {
    console.log(
      `Bounty submission ${bountySubmission.id} does not meet the trigger condition.`,
    );
    return;
  }

  // Mark the bounty as submitted
  const { partner } = await prisma.bountySubmission.update({
    where: {
      id: bountySubmission.id,
      status: "draft",
    },
    data: {
      status: "submitted",
      completedAt: new Date(),
    },
    include: {
      partner: true,
    },
  });

  if (partner.email) {
    await sendEmail({
      subject: "Bounty completed!",
      to: partner.email,
      variant: "notifications",
      replyTo: bounty.program.supportEmail || "noreply",
      react: BountyCompleted({
        email: partner.email,
        bounty: {
          name: bounty.name,
          type: bounty.type,
        },
        program: {
          name: bounty.program.name,
          slug: bounty.program.slug,
        },
      }),
    });

    // Send email to the program owners
    // TODO: combine with what we're doing on createBountySubmissionAction maybe?
    const { users, program, ...workspace } = await getWorkspaceUsers({
      programId: bounty.programId,
      role: WorkspaceRole.owner,
      notificationPreference: "newBountySubmitted",
    });

    if (users.length > 0) {
      await sendBatchEmail(
        users.map((user) => ({
          variant: "notifications",
          to: user.email,
          subject: "New bounty submission",
          react: NewBountySubmission({
            email: user.email,
            workspace: {
              slug: workspace.slug,
            },
            bounty: {
              id: bounty.id,
              name: bounty.name,
            },
            partner: {
              id: partner.id,
              name: partner.name,
              image: partner.image,
              email: partner.email!,
            },
            submission: {
              id: bountySubmission.id,
            },
          }),
        })),
      );
    }
  }
};
