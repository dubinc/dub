import { DubApiError } from "@/lib/api/errors";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getExpandableField } from "@/lib/expand/get-expandable-field";
import { prisma } from "@/lib/prisma";
import {
  Discount,
  EventType,
  LinkReward,
  Prisma,
  Reward,
} from "@prisma/client";

export type LinkRewardIdsInput = Partial<
  Pick<
    LinkReward,
    "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
  >
>;

type LinkRewardWithOptionalRewards = Pick<
  LinkReward,
  "clickRewardId" | "leadRewardId" | "saleRewardId" | "discountId"
> & {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
  discount?: Discount | null;
};

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

export const validateRewardIds = async ({
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

export const getLinkRewardExpandInclude = ({
  expandReward,
  expandDiscount,
}: {
  expandReward: boolean;
  expandDiscount: boolean;
}): true | { include: Prisma.LinkRewardInclude } => {
  if (!expandReward && !expandDiscount) {
    return true;
  }

  return {
    include: {
      ...(expandReward && {
        clickReward: true,
        leadReward: true,
        saleReward: true,
      }),
      ...(expandDiscount && {
        discount: true,
      }),
    },
  };
};

export const getExpandableRewardReferences = ({
  linkReward,
  expandReward,
  expandDiscount,
}: {
  linkReward: LinkRewardWithOptionalRewards | null | undefined;
  expandReward: boolean;
  expandDiscount: boolean;
}) => ({
  clickReward: getExpandableField({
    id: linkReward?.clickRewardId,
    entity: linkReward?.clickReward,
    expand: expandReward,
    serialize: serializeReward,
  }),
  leadReward: getExpandableField({
    id: linkReward?.leadRewardId,
    entity: linkReward?.leadReward,
    expand: expandReward,
    serialize: serializeReward,
  }),
  saleReward: getExpandableField({
    id: linkReward?.saleRewardId,
    entity: linkReward?.saleReward,
    expand: expandReward,
    serialize: serializeReward,
  }),
  discount: getExpandableField({
    id: linkReward?.discountId,
    entity: linkReward?.discount,
    expand: expandDiscount,
  }),
});
