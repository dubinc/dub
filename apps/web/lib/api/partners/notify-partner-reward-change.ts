import type { RewardJob } from "@/lib/api/rewards/queue-reward-processing";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { RewardProps } from "@/lib/types";
import type PartnerRewardUpdated from "@dub/email/templates/partner-reward-updated";
import { Program, Reward, User } from "@prisma/client";

const REWARD_ICONS: Record<RewardProps["event"], string> = {
  click: "https://assets.dub.co/email-assets/icons/cursor-rays.png",
  lead: "https://assets.dub.co/email-assets/icons/user-plus.png",
  sale: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
  referral: "https://assets.dub.co/email-assets/icons/nodes-4.png",
};

interface NotifyPartnerRewardChangeParams {
  action: RewardJob["event"];
  program: Pick<Program, "id" | "name" | "logo" | "slug" | "supportEmail">;
  reward: Pick<Reward, "id" | "event">;
  rewardSnapshot: { description: string };
  effectiveAt: Date | string;
  users: Pick<User, "name" | "email">[];
  idempotencyKey: string;
}

export async function notifyPartnerRewardChange({
  action,
  program,
  reward,
  rewardSnapshot,
  effectiveAt,
  users,
  idempotencyKey,
}: NotifyPartnerRewardChangeParams) {
  const usersWithEmail = users.filter(
    (user): user is Pick<User, "name"> & { email: string } =>
      user.email !== null,
  );

  if (usersWithEmail.length === 0) {
    return;
  }

  await queueBatchEmail<typeof PartnerRewardUpdated>(
    usersWithEmail.map((user) => ({
      to: user.email,
      subject: `Your rewards for ${program.name} have been updated`,
      variant: "notifications",
      templateName: "PartnerRewardUpdated",
      templateProps: {
        program: {
          name: program.name,
          logo: program.logo,
          slug: program.slug,
          supportEmail: program.supportEmail,
        },
        partner: {
          name: user.name ?? "",
          email: user.email,
        },
        rewardSnapshot: {
          description: rewardSnapshot.description,
          icon: REWARD_ICONS[reward.event],
        },
        effectiveAt,
        action,
      },
    })),
    {
      idempotencyKey,
    },
  );
}
