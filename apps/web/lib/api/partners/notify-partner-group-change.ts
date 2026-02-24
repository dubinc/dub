import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import type PartnerGroupChanged from "@dub/email/templates/partner-group-changed";
import { getPartnerInviteRewardsAndBounties } from "./get-partner-invite-rewards-and-bounties";
import { getPartnerUsers } from "./get-partner-users";

interface NotifyPartnerGroupChangeParams {
  programId: string;
  groupId: string;
  partnerIds: string[];
}

// Send email to partners when they are moved to a new group
export async function notifyPartnerGroupChange({
  programId,
  groupId,
  partnerIds,
}: NotifyPartnerGroupChangeParams) {
  if (partnerIds.length === 0) {
    return;
  }

  const [
    {
      rewards,
      bounties,
      group: { program },
    },
    partnerUsers,
  ] = await Promise.all([
    getPartnerInviteRewardsAndBounties({
      programId,
      groupId,
    }),

    getPartnerUsers({
      partnerIds,
    }),
  ]);

  await queueBatchEmail<typeof PartnerGroupChanged>(
    partnerUsers.map(({ partner, user }) => ({
      to: user.email!,
      subject: `You've been moved to a new group in ${program.name}'s partner program!`,
      variant: "notifications",
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
  );
}
