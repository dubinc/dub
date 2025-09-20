import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import {
  WorkflowAction,
  WorkflowCondition,
  WorkflowConditionAttribute,
  WorkflowContext,
} from "@/lib/types";
import { sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
import { prisma } from "@dub/prisma";
import { createId } from "../create-id";
import { evaluateWorkflowCondition } from "./execute-workflows";

export const executeAwardBountyAction = async ({
  condition,
  context,
  action,
}: {
  condition: WorkflowCondition;
  context: WorkflowContext;
  action: WorkflowAction;
}) => {
  if (action.type !== "awardBounty") {
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

  // Check bounty validity
  if (
    (bounty.startsAt && bounty.startsAt > now) ||
    (bounty.endsAt && bounty.endsAt < now) ||
    bounty.archivedAt
  ) {
    return;
  }

  const { groups, submissions } = bounty;

  // Check if the partner has already submitted a submission for this bounty
  if (submissions.length > 0) {
    const submission = submissions[0];

    if (submission.status !== "draft") {
      console.log(
        `Partner ${partnerId} has an existing submission for bounty ${bounty.id} with status ${submission.status}.`,
      );
      return;
    }
  }

  // If the bounty is part of a group, check if the partner is in the group
  if (groups.length > 0) {
    const groupIds = groups.map(({ groupId }) => groupId);

    if (!groupIds.includes(groupId)) {
      console.log(
        `Partner ${partnerId} is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups.`,
      );
      return;
    }
  }

  console.log(
    `Running the workflow ${bounty.workflowId} for bounty ${bounty.id}.`,
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

  const count = finalContext[condition.attribute] ?? 0;

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
      performanceCount: count,
    },
    update: {
      performanceCount: {
        increment: count,
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

  // Create the commission for the partner
  const commission = await createPartnerCommission({
    event: "custom",
    partnerId,
    programId: bounty.programId,
    amount: bounty.rewardAmount,
    quantity: 1,
    description: `Commission for successfully completed "${bounty.name}" bounty.`,
    skipWorkflow: true,
  });

  if (!commission) {
    console.error(
      `Failed to create commission for partner ${partnerId} in program ${bounty.programId} for bounty ${bounty.id}.`,
    );
    return;
  }

  // Update the bounty submission
  const { partner } = await prisma.bountySubmission.update({
    where: {
      id: bountySubmission.id,
    },
    data: {
      commissionId: commission.id,
      status: "approved",
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
  }
};
