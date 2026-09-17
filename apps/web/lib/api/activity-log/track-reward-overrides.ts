import {
  toDiscountActivitySnapshot,
  toLinkActivitySnapshot,
  toRewardActivitySnapshot,
} from "@/lib/api/activity-log/to-reward-activity-snapshot";
import {
  trackActivityLog,
  type TrackActivityLogInput,
} from "@/lib/api/activity-log/track-activity-log";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import type { LinkRewardIds } from "@/lib/api/rewards/additional-rewards";
import type { EnrollmentRewardIds } from "@/lib/api/rewards/reward-overrides";
import { prisma } from "@/lib/prisma";
import type { LinkProps } from "@/lib/types";
import { Prisma } from "@prisma/client";

type RewardOverrideBaseInput = {
  workspaceId: string;
  programId: string;
  partnerId: string;
  userId: string;
  previous: EnrollmentRewardIds;
  next: EnrollmentRewardIds;
  description?: string;
  tx: Prisma.TransactionClient;
};

export async function trackPartnerRewardOverrideLog(
  input: RewardOverrideBaseInput,
) {
  const {
    workspaceId,
    programId,
    partnerId,
    userId,
    previous,
    next,
    description,
    tx,
  } = input;

  const rewardFields = [
    ["clickReward", previous.clickRewardId, next.clickRewardId],
    ["leadReward", previous.leadRewardId, next.leadRewardId],
    ["saleReward", previous.saleRewardId, next.saleRewardId],
  ] as const;

  const changedRewardFields = rewardFields.filter(
    ([, oldId, newId]) => oldId !== newId,
  );
  const discountChanged = previous.discountId !== next.discountId;

  if (changedRewardFields.length === 0 && !discountChanged) {
    return;
  }

  const rewardIds = [
    ...new Set(
      changedRewardFields.flatMap(([, oldId, newId]) =>
        [oldId, newId].filter((id): id is string => Boolean(id)),
      ),
    ),
  ];

  const discountIds = [
    ...new Set(
      [previous.discountId, next.discountId].filter((id): id is string =>
        Boolean(id),
      ),
    ),
  ];

  const [rewards, discounts] = await Promise.all([
    rewardIds.length > 0
      ? tx.reward.findMany({
          where: {
            id: {
              in: rewardIds,
            },
          },
        })
      : [],

    discountChanged && discountIds.length > 0
      ? tx.discount.findMany({
          where: {
            id: {
              in: discountIds,
            },
          },
          select: {
            id: true,
            amount: true,
            type: true,
            maxDuration: true,
            description: true,
          },
        })
      : [],
  ]);

  const rewardsById = new Map<
    string,
    ReturnType<typeof toRewardActivitySnapshot>
  >();

  const discountsById = new Map<
    string,
    ReturnType<typeof toDiscountActivitySnapshot>
  >();

  for (const reward of rewards) {
    rewardsById.set(
      reward.id,
      toRewardActivitySnapshot(serializeReward(reward)),
    );
  }

  for (const discount of discounts) {
    discountsById.set(discount.id, toDiscountActivitySnapshot(discount));
  }

  const base = {
    workspaceId,
    programId,
    resourceType: "partner" as const,
    resourceId: partnerId,
    userId,
  };

  const activityLogs: TrackActivityLogInput[] = [];

  if (changedRewardFields.length > 0) {
    activityLogs.push({
      ...base,
      action: "partner.rewardChanged",
      description,
      changeSet: Object.fromEntries(
        changedRewardFields.map(([field, oldId, newId]) => [
          field,
          {
            old: oldId ? rewardsById.get(oldId) ?? { id: oldId } : null,
            new: newId ? rewardsById.get(newId) ?? { id: newId } : null,
          },
        ]),
      ),
    });
  }

  if (discountChanged) {
    activityLogs.push({
      ...base,
      action: "partner.discountChanged",
      description,
      changeSet: {
        discount: {
          old: previous.discountId
            ? discountsById.get(previous.discountId) ?? {
                id: previous.discountId,
              }
            : null,
          new: next.discountId
            ? discountsById.get(next.discountId) ?? { id: next.discountId }
            : null,
        },
      },
    });
  }

  await tx.activityLog.createMany({
    data: activityLogs.map((activityLog) => ({
      ...activityLog,
      changeSet: activityLog.changeSet as Prisma.InputJsonValue,
    })),
  });
}

type LinkSnapshot = Pick<LinkProps, "id" | "domain" | "key">;

// Track link-level reward/discount overrides. Unlike the partner-level tracker,
// this variant runs outside a transaction and dispatches via trackActivityLog.
export async function trackLinkRewardOverrideLog(input: {
  workspaceId: string;
  programId: string;
  partnerId: string;
  userId: string;
  previous: LinkRewardIds;
  next: LinkRewardIds;
  description?: string;
  link: LinkSnapshot;
}) {
  const {
    workspaceId,
    programId,
    partnerId,
    userId,
    previous,
    next,
    description,
    link,
  } = input;

  const rewardFields = [
    ["clickReward", previous.clickRewardId, next.clickRewardId],
    ["leadReward", previous.leadRewardId, next.leadRewardId],
    ["saleReward", previous.saleRewardId, next.saleRewardId],
  ] as const;

  const changedRewardFields = rewardFields.filter(
    ([, oldId, newId]) => oldId !== newId,
  );
  const discountChanged = previous.discountId !== next.discountId;

  if (changedRewardFields.length === 0 && !discountChanged) {
    return;
  }

  const rewardIds = [
    ...new Set(
      changedRewardFields.flatMap(([, oldId, newId]) =>
        [oldId, newId].filter((id): id is string => Boolean(id)),
      ),
    ),
  ];

  const discountIds = [
    ...new Set(
      [previous.discountId, next.discountId].filter((id): id is string =>
        Boolean(id),
      ),
    ),
  ];

  const [rewards, discounts] = await Promise.all([
    rewardIds.length > 0
      ? prisma.reward.findMany({
          where: { id: { in: rewardIds } },
        })
      : [],
    discountChanged && discountIds.length > 0
      ? prisma.discount.findMany({
          where: { id: { in: discountIds } },
          select: {
            id: true,
            amount: true,
            type: true,
            maxDuration: true,
            description: true,
          },
        })
      : [],
  ]);

  const rewardsById = new Map<
    string,
    ReturnType<typeof toRewardActivitySnapshot>
  >();
  const discountsById = new Map<
    string,
    ReturnType<typeof toDiscountActivitySnapshot>
  >();

  for (const reward of rewards) {
    rewardsById.set(
      reward.id,
      toRewardActivitySnapshot(serializeReward(reward)),
    );
  }

  for (const discount of discounts) {
    discountsById.set(discount.id, toDiscountActivitySnapshot(discount));
  }

  const base = {
    workspaceId,
    programId,
    resourceType: "partner" as const,
    resourceId: partnerId,
    userId,
  };

  const activityLogs: TrackActivityLogInput[] = [];

  if (changedRewardFields.length > 0) {
    activityLogs.push({
      ...base,
      action: "link.rewardChanged",
      description,
      changeSet: {
        link: {
          old: null,
          new: toLinkActivitySnapshot(link),
        },
        ...Object.fromEntries(
          changedRewardFields.map(([field, oldId, newId]) => [
            field,
            {
              old: oldId ? rewardsById.get(oldId) ?? { id: oldId } : null,
              new: newId ? rewardsById.get(newId) ?? { id: newId } : null,
            },
          ]),
        ),
      },
    });
  }

  if (discountChanged) {
    activityLogs.push({
      ...base,
      action: "link.discountChanged",
      description,
      changeSet: {
        link: {
          old: null,
          new: toLinkActivitySnapshot(link),
        },
        discount: {
          old: previous.discountId
            ? discountsById.get(previous.discountId) ?? {
                id: previous.discountId,
              }
            : null,
          new: next.discountId
            ? discountsById.get(next.discountId) ?? { id: next.discountId }
            : null,
        },
      },
    });
  }

  await trackActivityLog(activityLogs);
}
