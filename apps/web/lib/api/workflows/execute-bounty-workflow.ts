import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import {
  OPERATOR_FUNCTIONS,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { Bounty, BountySubmissionStatus, Workflow } from "@dub/prisma/client";
import { z } from "zod";
import { createId } from "../create-id";

export const executeBountyWorkflow = async ({
  programId,
  partnerId,
  workflow,
  bounty,
}: {
  programId: string;
  partnerId: string;
  workflow: Workflow;
  bounty: Bounty;
}) => {
  console.log(`Executing workflow ${workflow.id} for partner ${partnerId}.`);

  const now = new Date();

  if (bounty.startsAt && bounty.startsAt > now) {
    console.log(`Bounty ${bounty.id} has not started yet.`);
    return;
  }

  if (bounty.endsAt && bounty.endsAt < now) {
    console.log(`Bounty ${bounty.id} has already ended on ${bounty.endsAt}.`);
    return;
  }

  // Find the program enrollment for the partner
  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId,
        programId,
      },
    },
    select: {
      groupId: true,
      totalCommissions: true,
      links: {
        select: {
          leads: true,
          conversions: true,
          saleAmount: true,
        },
      },
      bountySubmission: {
        where: {
          bountyId: bounty.id,
        },
      },
    },
  });

  if (!programEnrollment) {
    console.error(
      `Partner ${partnerId} is not enrolled in program ${programId}.`,
    );
    return;
  }

  if (!programEnrollment?.groupId) {
    console.error(
      `Partner ${partnerId} doesn't belong to any group for program ${programId}.`,
    );
    return;
  }

  if (programEnrollment.bountySubmission.length > 0) {
    console.log(
      `Partner ${partnerId} has an existing submission for bounty ${bounty.id}.`,
    );
    return;
  }

  // Find the groups for the bounty
  const bountyGroups = await prisma.bountyGroup.findMany({
    where: {
      bountyId: bounty.id,
    },
    select: {
      groupId: true,
    },
  });

  // If the bounty is part of a group, check if the partner is in the group
  if (bountyGroups.length > 0) {
    const allowedGroupIds = bountyGroups.map(({ groupId }) => groupId);

    if (!allowedGroupIds.includes(programEnrollment.groupId)) {
      console.log(
        `Partner ${partnerId} is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups.`,
      );
      return;
    }
  }

  // Calculate the metrics
  const totalCommission = programEnrollment.totalCommissions;

  const { totalLeads, totalConversions, totalSaleAmount } =
    programEnrollment.links.reduce(
      (acc, link) => {
        acc.totalLeads += link.leads;
        acc.totalConversions += link.conversions;
        acc.totalSaleAmount += link.saleAmount;
        return acc;
      },
      { totalLeads: 0, totalConversions: 0, totalSaleAmount: 0 },
    );

  // Evaluate the workflow condition
  const workflowConditions = z
    .array(workflowConditionSchema)
    .parse(workflow.triggerConditions);

  if (workflowConditions.length === 0) {
    console.error(
      `Bounty ${bounty.id} has no workflow conditions. It seems like workflow configuration is incorrect.`,
    );
    return;
  }

  // Note: We only support one condition for now
  const { attribute, operator, value } = workflowConditions[0];
  const operatorFn = OPERATOR_FUNCTIONS[operator];

  if (!operatorFn) {
    throw new Error(
      `Operator ${operator} is not supported in the workflow trigger condition.`,
    );
  }

  const context = {
    totalCommission,
    totalLeads,
    totalConversions,
    totalSaleAmount,
  };

  console.log(`Running the workflow with the context`, context);

  const isEligible = operatorFn(context[attribute], value);

  if (!isEligible) {
    console.log(
      `Partner ${partnerId} does not meet the requirements for bounty ${bounty.id}.`,
      {
        attribute,
        value,
      },
    );
    return;
  }

  const commission = await createPartnerCommission({
    event: "custom",
    partnerId,
    programId,
    amount: bounty.rewardAmount,
    quantity: 1,
  });

  if (!commission) {
    console.error(
      `Failed to create commission for partner ${partnerId} in program ${programId} for bounty ${bounty.id}.`,
    );
    return;
  }

  const bountySubmission = await prisma.bountySubmission.create({
    data: {
      id: createId({ prefix: "bounty_submission_" }),
      programId,
      partnerId,
      bountyId: bounty.id,
      commissionId: commission.id,
      status: BountySubmissionStatus.approved,
    },
  });

  console.log(
    `A new bounty submission ${bountySubmission.id} is created for ${partnerId} for the bounty ${bounty.id}.`,
  );
};
