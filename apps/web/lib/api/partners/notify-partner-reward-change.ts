import type { RewardJob } from "@/lib/api/rewards/queue-reward-processing";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { RewardProps } from "@/lib/types";
import { REWARD_EVENT_DESCRIPTIONS } from "@/ui/partners/rewards/reward-event-descriptions";
import type PartnerRewardsUpdated from "@dub/email/templates/partner-rewards-updated";
import { Program, Reward, User } from "@dub/prisma/client";

const REWARD_ICONS: Record<RewardProps["event"], string> = {
  click: "https://assets.dub.co/email-assets/icons/cursor-rays.png",
  lead: "https://assets.dub.co/email-assets/icons/user-plus.png",
  sale: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
  referral: "https://assets.dub.co/email-assets/icons/nodes-4.png",
};

type RewardJobEvent = RewardJob["event"];

const REWARD_EVENT_TO_EMAIL_ACTION: Record<
  RewardJobEvent,
  "added" | "updated" | "removed"
> = {
  "reward-created": "added",
  "reward-updated": "updated",
  "reward-deleted": "removed",
};

interface NotifyPartnerRewardChangeParams {
  action: RewardJobEvent;
  program: Pick<Program, "id" | "name" | "logo" | "slug" | "supportEmail">;
  reward: Pick<Reward, "id" | "event">;
  rewardSnapshot: { description: string };
  effectiveAt: Date | string;
  users: Pick<User, "name" | "email">[];
}

export async function notifyPartnerRewardChange({
  action,
  program,
  reward,
  rewardSnapshot,
  effectiveAt,
  users,
}: NotifyPartnerRewardChangeParams) {
  const icon = REWARD_ICONS[reward.event];
  const title = REWARD_EVENT_DESCRIPTIONS[reward.event].title;
  const emailAction = REWARD_EVENT_TO_EMAIL_ACTION[action];

  await queueBatchEmail<typeof PartnerRewardsUpdated>(
    users.map((user) => ({
      to: user.email!,
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
          name: user.name ?? "",
          email: user.email!,
        },
        effectiveAt,
        changes: [
          {
            action: emailAction,
            title,
            description: rewardSnapshot.description,
            icon,
          },
        ],
      },
    })),
  );
}
