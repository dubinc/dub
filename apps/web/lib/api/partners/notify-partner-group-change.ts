import { DubApiError } from "@/lib/api/errors";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import type PartnerGroupChanged from "@dub/email/templates/partner-group-changed";
import { getGroupRewardsAndBounties } from "./get-group-rewards-and-bounties";
import { getPartnerUsers } from "./get-partner-users";

interface NotifyPartnerGroupChangeParams {
  programId: string;
  groupId: string;
  partnerIds: string[];
  idempotencyKey?: string;
}

// Send email to partners when they are moved to a new group
export async function notifyPartnerGroupChange({
  programId,
  groupId,
  partnerIds,
  idempotencyKey,
}: NotifyPartnerGroupChangeParams) {
  if (partnerIds.length === 0) {
    return;
  }

  let groupRewards: Awaited<ReturnType<typeof getGroupRewardsAndBounties>>;

  try {
    groupRewards = await getGroupRewardsAndBounties({
      programId,
      groupId,
    });
  } catch (error) {
    if (
      error instanceof DubApiError &&
      (error.code === "not_found" || error.code === "forbidden")
    ) {
      console.info(`Group ${groupId} not found. Skipping...`);
      return;
    }

    throw error;
  }

  const {
    rewards,
    bounties,
    group: { program },
  } = groupRewards;

  const partnerUsers = await getPartnerUsers({
    partnerIds,
  });

  await queueBatchEmail<typeof PartnerGroupChanged>(
    partnerUsers.map(({ partner, user }) => ({
      to: user.email!,
      subject: `You've been moved to a new group in ${program.name}'s partner program!`,
      variant: "notifications",
      replyTo: program.supportEmail || "noreply",
      templateName: "PartnerGroupChanged",
      templateProps: {
        program: {
          name: program.name,
          logo: program.logo,
          slug: program.slug,
        },
        partner: {
          name: partner.name,
          email: user.email!,
        },
        rewards,
        bounties,
      },
    })),
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}
