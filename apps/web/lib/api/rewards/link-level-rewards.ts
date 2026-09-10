import { DubApiError } from "@/lib/api/errors";
import { serializeReward } from "@/lib/api/partners/serialize-reward";
import { getExpandableField } from "@/lib/api/utils/get-expandable-field";
import { prisma } from "@/lib/prisma";
import { EventType, LinkReward, Reward } from "@prisma/client";

export type LinkRewardIdsInput = Partial<
  Pick<LinkReward, "clickRewardId" | "leadRewardId" | "saleRewardId">
>;

type LinkRewardWithOptionalRewards = Pick<
  LinkReward,
  "clickRewardId" | "leadRewardId" | "saleRewardId"
> & {
  clickReward?: Reward | null;
  leadReward?: Reward | null;
  saleReward?: Reward | null;
};

export const hasRewardIdsInput = ({
  clickRewardId,
  leadRewardId,
  saleRewardId,
}: LinkRewardIdsInput) => {
  return (
    clickRewardId !== undefined ||
    leadRewardId !== undefined ||
    saleRewardId !== undefined
  );
};

export const getLinkRewardIds = (
  linkReward: LinkRewardIdsInput | null | undefined,
) => ({
  clickReward: linkReward?.clickRewardId ?? null,
  leadReward: linkReward?.leadRewardId ?? null,
  saleReward: linkReward?.saleRewardId ?? null,
});

export const validateRewardIds = async ({
  programId,
  clickRewardId,
  leadRewardId,
  saleRewardId,
}: {
  programId: string;
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

  if (assignments.length === 0) {
    return;
  }

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
  }
};

export const getExpandableRewardReferences = ({
  linkReward,
  expand,
}: {
  linkReward: LinkRewardWithOptionalRewards | null | undefined;
  expand: boolean;
}) => ({
  clickReward: getExpandableField({
    id: linkReward?.clickRewardId,
    entity: linkReward?.clickReward,
    expand,
    serialize: serializeReward,
  }),
  leadReward: getExpandableField({
    id: linkReward?.leadRewardId,
    entity: linkReward?.leadReward,
    expand,
    serialize: serializeReward,
  }),
  saleReward: getExpandableField({
    id: linkReward?.saleRewardId,
    entity: linkReward?.saleReward,
    expand,
    serialize: serializeReward,
  }),
});
