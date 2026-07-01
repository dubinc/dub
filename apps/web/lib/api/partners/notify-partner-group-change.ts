import { isPartnerEligibleForBounty } from "@/lib/bounty/api/bounty-eligibility";
import { getGroupBounties } from "@/lib/bounty/api/get-group-bounties";
import { BOUNTY_ICONS } from "@/lib/bounty/constants";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import PartnerGroupChanged from "@dub/email/templates/partner-group-changed";
import { ProgramEnrollment, ProgramPartnerTag } from "@prisma/client";
import { getGroupRewardsAndBounties } from "./get-group-rewards-and-bounties";
import { getPartnerUsers } from "./get-partner-users";

interface NotifyPartnerGroupChangeParams {
  programId: string;
  groupId: string;
  programEnrollments: (Pick<
    ProgramEnrollment,
    "partnerId" | "groupId" | "createdAt" | "groupJoinedAt" | "status"
  > & {
    programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  })[];
}

// Send email to partners when they are moved to a new group
export async function notifyPartnerGroupChange({
  programId,
  groupId,
  programEnrollments,
}: NotifyPartnerGroupChangeParams) {
  if (programEnrollments.length === 0) {
    return;
  }

  const partnerIds = programEnrollments.map(({ partnerId }) => partnerId);

  const [
    {
      rewards,
      group: { program },
    },
    partnerUsers,
    bounties,
  ] = await Promise.all([
    getGroupRewardsAndBounties({
      programId,
      groupId,
      includeBounties: false,
    }),

    getPartnerUsers({
      partnerIds,
    }),

    getGroupBounties({
      programId,
      groupId,
    }),
  ]);

  // Filter eligible bounties for each partner
  const partnerBounties = new Map<
    string,
    {
      icon: string;
      label: string;
    }[]
  >();

  for (const programEnrollment of programEnrollments) {
    const eligibleBounties = bounties.filter((bounty) =>
      isPartnerEligibleForBounty({
        programEnrollment,
        bounty,
      }),
    );

    if (eligibleBounties.length > 0) {
      const formattedBounties = eligibleBounties.map((bounty) => ({
        icon: BOUNTY_ICONS[bounty.type],
        label: bounty.name,
      }));

      partnerBounties.set(programEnrollment.partnerId, formattedBounties);
    }
  }

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
        bounties: partnerBounties.get(partner.id) ?? [],
      },
    })),
  );
}
