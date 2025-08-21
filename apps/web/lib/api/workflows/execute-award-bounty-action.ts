import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { WorkflowAction, WorkflowContext } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { createId } from "../create-id";

export const executeAwardBountyAction = async ({
  action,
  context,
}: {
  action: WorkflowAction;
  context: WorkflowContext;
}) => {
  if (action.type !== "awardBounty") {
    return;
  }

  const { bountyId } = action.data;
  const { partnerId, groupId } = context;

  // Find the bounty
  const bounty = await prisma.bounty.findUnique({
    where: {
      id: bountyId,
    },
    include: {
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

  const now = new Date();

  // Check bounty validity
  if (bounty.startsAt && bounty.startsAt > now) {
    return;
  }

  if (bounty.endsAt && bounty.endsAt < now) {
    return;
  }

  // Check if the partner has already submitted a submission for this bounty
  if (bounty.submissions.length > 0) {
    console.log(
      `Partner ${partnerId} has an existing submission for bounty ${bounty.id}.`,
    );
    return;
  }

  // If the bounty is part of a group, check if the partner is in the group
  if (bounty.groups.length > 0) {
    const groupIds = bounty.groups.map(({ groupId }) => groupId);

    if (!groupIds.includes(groupId)) {
      console.log(
        `Partner ${partnerId} is not eligible for bounty ${bounty.id} because they are not in any of the assigned groups.`,
      );
      return;
    }
  }

  console.log(`Running the workflow with the context`, context);

  const commission = await createPartnerCommission({
    event: "custom",
    partnerId,
    programId: bounty.programId,
    amount: bounty.rewardAmount,
    quantity: 1,
  });

  if (!commission) {
    console.error(
      `Failed to create commission for partner ${partnerId} in program ${bounty.programId} for bounty ${bounty.id}.`,
    );
    return;
  }

  const bountySubmission = await prisma.bountySubmission.create({
    data: {
      id: createId({ prefix: "bnty_sub_" }),
      programId: bounty.programId,
      partnerId,
      bountyId: bounty.id,
      commissionId: commission.id,
    },
  });

  console.log(
    `A new bounty submission ${bountySubmission.id} is created for ${partnerId} for the bounty ${bounty.id}.`,
  );
};
