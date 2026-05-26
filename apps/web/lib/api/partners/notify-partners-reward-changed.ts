import type { RewardSnapshot } from "@/lib/api/rewards/queue-reward-enrollment-sync";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { RewardProps } from "@/lib/types";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { REWARD_EVENT_DESCRIPTIONS } from "@/ui/partners/rewards/reward-event-descriptions";
import type PartnerRewardsUpdated from "@dub/email/templates/partner-rewards-updated";
import { prisma } from "@dub/prisma";

const REWARD_ICONS: Record<RewardProps["event"], string> = {
  click: "https://assets.dub.co/email-assets/icons/cursor-rays.png",
  lead: "https://assets.dub.co/email-assets/icons/user-plus.png",
  sale: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
  referral: "https://assets.dub.co/email-assets/icons/nodes-4.png",
};

type RewardChangeAction = "added" | "updated" | "removed";

interface NotifyPartnersRewardChangedParams {
  programId: string;
  groupId: string;
  action: RewardChangeAction;
  effectiveAt: Date;
  reward?: RewardProps;
  rewardSnapshot?: RewardSnapshot;
  idempotencyKey?: string;
}

export function getRewardEmailSnapshot(reward: RewardProps): RewardSnapshot {
  return {
    title: REWARD_EVENT_DESCRIPTIONS[reward.event].title,
    description: formatRewardDescription(reward, {
      includeEarnPrefix: false,
    }),
    icon: REWARD_ICONS[reward.event],
  };
}

export async function notifyPartnersRewardChanged({
  programId,
  groupId,
  action,
  effectiveAt,
  reward,
  rewardSnapshot,
  idempotencyKey,
}: NotifyPartnersRewardChangedParams) {
  const snapshot =
    rewardSnapshot ?? (reward ? getRewardEmailSnapshot(reward) : null);

  if (!snapshot) {
    console.log(`No snapshot found for reward ${reward?.id}.`);
    return;
  }

  const program = await prisma.program.findUnique({
    where: {
      id: programId,
    },
    include: {
      partners: {
        where: {
          groupId,
          partner: {
            email: {
              not: null,
            },
          },
        },
        include: {
          partner: true,
        },
      },
    },
  });
  if (!program) {
    console.log(
      `No program with partners found for program ${programId} and group ${groupId}.`,
    );
    return;
  }

  const partnersToNotify = program.partners.map(({ partner }) => partner);

  await queueBatchEmail<typeof PartnerRewardsUpdated>(
    partnersToNotify.map((partner) => ({
      to: partner.email!,
      subject: `Your rewards for ${program.name} have been updated`,
      variant: "notifications",
      templateName: "PartnerRewardsUpdated",
      templateProps: {
        program: {
          name: program.name,
          logo: program.logo,
          slug: program.slug,
          supportEmail: program.supportEmail,
        },
        partner: {
          name: partner.name,
          email: partner.email!,
        },
        effectiveAt,
        changes: [
          {
            action,
            title: snapshot.title,
            description: snapshot.description,
            icon: snapshot.icon,
          },
        ],
      },
    })),
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}
