import { WorkflowConditionAttribute, WorkflowContext } from "@/lib/types";
import { WORKFLOW_ACTION_TYPES } from "@/lib/zod/schemas/workflows";
import { sendBatchEmail, sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import { prisma } from "@dub/prisma";
import { Workflow, WorkspaceRole } from "@dub/prisma/client";
import { createId } from "../create-id";
import { getWorkspaceUsers } from "../get-workspace-users";
import { evaluateWorkflowCondition } from "./execute-workflows";
import { parseWorkflowConfig } from "./parse-workflow-config";

export const executeCompleteBountyWorkflow = async ({
  workflow,
  context,
}: {
  workflow: Workflow;
  context: WorkflowContext;
}) => {
  const { condition, action } = parseWorkflowConfig(workflow);

  if (action.type !== WORKFLOW_ACTION_TYPES.AwardBounty) {
    return;
  }

  const { bountyId } = action.data;
  const { partnerId, groupId } = context;

  if (!groupId) {
    console.error(`Partner groupId not set in the context.`);
    return;
  }

  // Find the bounty
  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
    include: {
      program: true,
      groups: true,
      submissions: {
        where: {
          partnerId,
        },
      },
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

  const now = new Date();

  // Check if bounty is active
  if (
    (bounty.startsAt && bounty.startsAt > now) ||
    (bounty.endsAt && bounty.endsAt < now) ||
    bounty.archivedAt
  ) {
    console.log(`Bounty ${bounty.id} is no longer active.`);
    return;
  }

  const { groups, submissions } = bounty;

  // If the bounty is part of a group, check if the partner is in the group
  if (groups.length > 0) {
    const groupIds = groups.map(({ groupId }) => groupId);

    if (!groupIds.includes(groupId)) {
      console.log(
        `Partner ${partnerId} is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups. Partner's groupId: ${groupId}. Assigned groupIds: ${groupIds.join(", ")}.`,
      );
      return;
    }
  }

  if (submissions.length > 0) {
    const submission = submissions[0];

    if (submission.status === "submitted" || submission.status === "approved") {
      console.log(
        `Partner ${partnerId} has already ${submission.status === "submitted" ? "finished" : "been awarded"} this bounty (bountyId: ${bounty.id}, submissionId: ${submissions[0].id}).`,
      );

      return;
    }
  }

  console.log(
    `Partner is eligible for bounty ${bounty.id}, executing workflow ${bounty.workflowId}...`,
  );

  const finalContext: Partial<
    Record<WorkflowConditionAttribute, number | null>
  > = {
    ...(condition.attribute === "totalLeads" && {
      totalLeads: context.current?.leads ?? 0,
    }),
    ...(condition.attribute === "totalConversions" && {
      totalConversions: context.current?.conversions ?? 0,
    }),
    ...(condition.attribute === "totalSaleAmount" && {
      totalSaleAmount: context.current?.saleAmount ?? 0,
    }),
    ...(condition.attribute === "totalCommissions" && {
      totalCommissions: context.current?.commissions ?? 0,
    }),
  };

  const performanceCount = finalContext[condition.attribute] ?? 0;

  // Create or update the submission
  const bountySubmission = await prisma.bountySubmission.upsert({
    where: {
      bountyId_partnerId: {
        bountyId,
        partnerId,
      },
    },
    create: {
      id: createId({ prefix: "bnty_sub_" }),
      programId: bounty.programId,
      partnerId,
      bountyId: bounty.id,
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
  const shouldExecute = evaluateWorkflowCondition({
    condition,
    attributes: {
      [condition.attribute]: bountySubmission.performanceCount,
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
