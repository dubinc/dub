import {
  OPERATOR_FUNCTIONS,
  workflowConditionSchema,
} from "@/lib/zod/schemas/workflows";
import { prisma } from "@dub/prisma";
import { WorkflowTrigger } from "@dub/prisma/client";
import { z } from "zod";

export const validatePerformanceBounty = async ({
  programId,
  partnerId,
  workflowTrigger,
}: {
  programId: string;
  partnerId: string;
  workflowTrigger: WorkflowTrigger;
}) => {
  const now = new Date();

  // Find all active bounties for the program
  const bounties = await prisma.bounty.findMany({
    where: {
      programId,
      workflow: {
        trigger: workflowTrigger,
      },
      startsAt: {
        lte: now,
      },
      OR: [
        {
          endsAt: {
            gte: now,
          },
        },
        {
          endsAt: null,
        },
      ],
    },
    include: {
      groups: true,
      workflow: true,
      submissions: {
        where: {
          partnerId,
          programId,
        },
      },
    },
  });

  if (bounties.length === 0) {
    console.log(`Program ${programId} has no active performance bounties.`);
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

  // Evaluate each bounty to see if the partner is eligible for it
  for (const bounty of bounties) {
    if (!bounty.workflow) {
      console.error(`Bounty ${bounty.id} has no workflow.`);
      continue;
    }

    const workflowConditions = z
      .array(workflowConditionSchema)
      .parse(bounty.workflow.triggerConditions);

    if (workflowConditions.length === 0) {
      console.error(
        `Bounty ${bounty.id} has no workflow conditions. It seems like workflow configuration is incorrect.`,
      );
      continue;
    }

    console.log(bounty);

    if (bounty.submissions.length > 0) {
      console.log(
        `Partner ${partnerId} has an existing submission for bounty ${bounty.id}.`,
      );
      continue;
    }

    if (bounty.groups.length > 0) {
      const allowedGroupIds = bounty.groups.map(({ id }) => id);

      if (!allowedGroupIds.includes(programEnrollment.groupId)) {
        console.log(
          `Partner ${partnerId} is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups.`,
        );
        continue;
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

    const context = {
      totalCommission,
      totalLeads,
      totalConversions,
      totalSaleAmount,
    };

    console.log(context);

    // Evaluate the workflow condition
    // Note: We only support one condition for now
    const { attribute, operator, value } = workflowConditions[0];
    const operatorFn = OPERATOR_FUNCTIONS[operator];

    if (!operatorFn) {
      throw new Error(
        `Operator ${operator} is not supported in the workflow trigger condition.`,
      );
    }

    const isEligible = operatorFn(context[attribute], value);

    if (!isEligible) {
      console.log(
        `Partner ${partnerId} does not meet the requirements for bounty ${bounty.id}.`,
      );
    }

    // TODO
  }
};
