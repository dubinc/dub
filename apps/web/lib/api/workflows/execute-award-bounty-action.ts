import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { WorkflowAction, WorkflowContext } from "@/lib/types";
import { sendEmail } from "@dub/email";
import BountyCompleted from "@dub/email/templates/bounty-completed";
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

  const now = new Date();

  // Check bounty validity
  if (bounty.startsAt && bounty.startsAt > now) {
    return;
  }

  if (bounty.endsAt && bounty.endsAt < now) {
    return;
  }

  if (bounty.archivedAt) {
    return;
  }

  const { groups, submissions } = bounty;

  // Check if the partner has already submitted a submission for this bounty
  if (submissions.length > 0) {
    console.log(
      `Partner ${partnerId} has an existing submission for bounty ${bounty.id}.`,
    );
    return;
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

  const { id: bountySubmissionId, partner } =
    await prisma.bountySubmission.create({
      data: {
        id: createId({ prefix: "bnty_sub_" }),
        programId: bounty.programId,
        partnerId,
        bountyId: bounty.id,
        commissionId: commission.id,
        status: "approved",
      },
      include: {
        partner: true,
      },
    });

  console.log(
    `A new bounty submission ${bountySubmissionId} is created for ${partnerId} for the bounty ${bounty.id}.`,
  );

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
