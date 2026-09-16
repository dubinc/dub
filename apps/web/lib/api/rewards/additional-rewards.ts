import { DubApiError } from "@/lib/api/errors";
import { prisma } from "@/lib/prisma";
import { Discount, EventType, LinkReward, Reward } from "@prisma/client";

export type LinkRewardIds = Pick<
  LinkReward,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
>;

export type LinkRewardIdsInput = Partial<LinkRewardIds>;

export type LinkRewardWithOptionalRewards = LinkRewardIds & {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  discount?: Discount | null;
};

// True when any reward/discount field was sent, including explicit null clears.
export const hasRewardIdsInput = ({
  clickRewardId,
  leadRewardId,
  saleRewardId,
  discountId,
}: LinkRewardIdsInput) => {
  return (
    clickRewardId !== undefined ||
    leadRewardId !== undefined ||
    saleRewardId !== undefined ||
    discountId !== undefined
  );
};

// True when any field assigns a non-null reward/discount id (not a clear).
export const hasRewardAssignment = ({
  clickRewardId,
  leadRewardId,
  saleRewardId,
  discountId,
}: LinkRewardIdsInput) => {
  return [clickRewardId, leadRewardId, saleRewardId, discountId].some(
    (id) => id !== undefined && id !== null,
  );
};

// Group defaults are inherited; only persist real link-level overrides.
const omitGroupDefault = ({
  value,
  groupDefaultId,
}: {
  value: string | null | undefined;
  groupDefaultId: string | null | undefined;
}) => (value && value === groupDefaultId ? null : value);

export const omitGroupDefaultRewardIds = ({
  rewardIds,
  groupDefaults,
}: {
  rewardIds: LinkRewardIdsInput;
  groupDefaults: Partial<LinkRewardIds> | null | undefined;
}): LinkRewardIdsInput => ({
  clickRewardId:
    rewardIds.clickRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.clickRewardId,
          groupDefaultId: groupDefaults?.clickRewardId,
        }),
  leadRewardId:
    rewardIds.leadRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.leadRewardId,
          groupDefaultId: groupDefaults?.leadRewardId,
        }),
  saleRewardId:
    rewardIds.saleRewardId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.saleRewardId,
          groupDefaultId: groupDefaults?.saleRewardId,
        }),
  discountId:
    rewardIds.discountId === undefined
      ? undefined
      : omitGroupDefault({
          value: rewardIds.discountId,
          groupDefaultId: groupDefaults?.discountId,
        }),
});

export const getRewardIds = (
  linkReward: LinkRewardIdsInput | null | undefined,
) => ({
  clickReward: linkReward?.clickRewardId ?? null,
  leadReward: linkReward?.leadRewardId ?? null,
  saleReward: linkReward?.saleRewardId ?? null,
  discount: linkReward?.discountId ?? null,
});

const belongsToGroup = ({
  groupId,
  entityGroupId,
  defaultGroupId,
}: {
  groupId: string;
  entityGroupId: string | null;
  defaultGroupId?: string | null;
}) => entityGroupId === groupId || defaultGroupId === groupId;

export const throwIfInvalidRewardIds = async ({
  programId,
  groupId,
  clickRewardId,
  leadRewardId,
  saleRewardId,
  discountId,
}: {
  programId: string;
  groupId: string | null | undefined;
} & LinkRewardIdsInput) => {
  const assignments: {
    id: string;
    event: EventType;
  }[] = [];

  if (clickRewardId) {
    assignments.push({
      id: clickRewardId,
      event: EventType.click,
    });
  }

  if (leadRewardId) {
    assignments.push({
      id: leadRewardId,
      event: EventType.lead,
    });
  }

  if (saleRewardId) {
    assignments.push({
      id: saleRewardId,
      event: EventType.sale,
    });
  }

  if (assignments.length === 0 && !discountId) {
    return;
  }

  if (!groupId) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "This partner is not part of a partner group.",
    });
  }

  if (assignments.length > 0) {
    const rewards = await prisma.reward.findMany({
      where: {
        id: {
          in: assignments.map(({ id }) => id),
        },
        programId,
      },
      select: {
        id: true,
        event: true,
        groupId: true,
        clickPartnerGroup: {
          select: {
            id: true,
          },
        },
        leadPartnerGroup: {
          select: {
            id: true,
          },
        },
        salePartnerGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    const rewardsById = new Map(rewards.map((reward) => [reward.id, reward]));

    for (const assignment of assignments) {
      const reward = rewardsById.get(assignment.id);

      if (!reward) {
        throw new DubApiError({
          code: "not_found",
          message: `Reward ${assignment.id} not found.`,
        });
      }

      if (reward.event !== assignment.event) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `Reward ${assignment.id} is a ${reward.event} reward and cannot be assigned as a ${assignment.event} reward.`,
        });
      }

      if (
        !belongsToGroup({
          groupId,
          entityGroupId: reward.groupId,
          defaultGroupId:
            reward.clickPartnerGroup?.id ??
            reward.leadPartnerGroup?.id ??
            reward.salePartnerGroup?.id,
        })
      ) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: `Reward ${assignment.id} does not belong to this partner's group.`,
        });
      }
    }
  }

  if (discountId) {
    const discount = await prisma.discount.findFirst({
      where: {
        id: discountId,
        programId,
      },
      select: {
        id: true,
        groupId: true,
        partnerGroup: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!discount) {
      throw new DubApiError({
        code: "not_found",
        message: `Discount ${discountId} not found.`,
      });
    }

    if (
      !belongsToGroup({
        groupId,
        entityGroupId: discount.groupId,
        defaultGroupId: discount.partnerGroup?.id,
      })
    ) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: `Discount ${discountId} does not belong to this partner's group.`,
      });
    }
  }
};
