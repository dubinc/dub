import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { RewardJob } from "@/lib/api/rewards/queue-reward-processing";
import type { EnrollmentRewardIds } from "@/lib/api/rewards/reward-overrides";
import { queueBatchEmail } from "@/lib/email/queue-batch-email";
import { prisma } from "@/lib/prisma";
import { RewardProps } from "@/lib/types";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import type PartnerRewardUpdated from "@dub/email/templates/partner-reward-updated";
import { Program, Reward, User } from "@prisma/client";
import { getPartnerUsers } from "./get-partner-users";

const REWARD_ICONS: Record<RewardProps["event"], string> = {
  click: "https://assets.dub.co/email-assets/icons/cursor-rays.png",
  lead: "https://assets.dub.co/email-assets/icons/user-plus.png",
  sale: "https://assets.dub.co/email-assets/icons/invoice-dollar.png",
  referral: "https://assets.dub.co/email-assets/icons/nodes-4.png",
  custom: "https://assets.dub.co/cms/icon-calendar-bounty.png",
};

interface NotifyPartnerRewardChangeParams {
  action: RewardJob["event"];
  program: Pick<Program, "id" | "name" | "logo" | "slug" | "supportEmail">;
  reward: Pick<Reward, "id" | "event">;
  rewardSnapshot: { description: string; activityDescription?: string };
  effectiveAt: Date | string;
  users: Pick<User, "name" | "email">[];
  idempotencyKey?: string;
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
  // TODO: Remove after Aug 24
  if (program.id === "prog_1JWVR53QX1NM7NDEK62E3J19H") {
    console.log("Skipping notification for program", program.id);
    return;
  }

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
          activityDescription: rewardSnapshot.activityDescription,
        },
        effectiveAt,
        action,
      },
    })),
    idempotencyKey ? { idempotencyKey } : undefined,
  );
}

type OverrideRewardIds = Pick<
  EnrollmentRewardIds,
  "clickRewardId" | "leadRewardId" | "saleRewardId"
>;

export async function notifyPartnerRewardOverride({
  programId,
  partnerId,
  previous,
  next,
  groupRewardIds,
  activityDescription,
}: {
  programId: string;
  partnerId: string;
  previous: OverrideRewardIds;
  next: OverrideRewardIds;
  groupRewardIds?: OverrideRewardIds;
  activityDescription?: string;
}) {
  const rewardId = (
    ["clickRewardId", "leadRewardId", "saleRewardId"] as const
  ).reduce<string | null>((found, field) => {
    if (found || previous[field] === next[field]) {
      return found;
    }

    return next[field] ?? groupRewardIds?.[field] ?? null;
  }, null);

  if (!rewardId) {
    return;
  }

  const [program, reward, partnerUsers] = await Promise.all([
    prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        id: true,
        name: true,
        logo: true,
        slug: true,
        supportEmail: true,
      },
    }),

    prisma.reward.findUnique({
      where: {
        id: rewardId,
      },
    }),

    getPartnerUsers({
      partnerIds: [partnerId],
    }),
  ]);

  if (!program || !reward || partnerUsers.length === 0) {
    return;
  }

  await notifyPartnerRewardChange({
    action: "reward-updated",
    program,
    reward,
    rewardSnapshot: {
      description: formatRewardDescription(serializeReward(reward), {
        includeEarnPrefix: false,
      }),
      activityDescription,
    },
    effectiveAt: new Date(),
    users: partnerUsers.map(({ user }) => user),
  });
}
