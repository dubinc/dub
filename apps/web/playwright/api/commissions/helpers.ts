import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { DEFAULT_ADDITIONAL_PARTNER_LINKS } from "@/lib/zod/schemas/groups";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { EventType, RewardStructure } from "@prisma/client";
import type { ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";
import { TEST_WORKSPACE } from "../setup-test-workspace";

export const LEAD_REWARD_CENTS = 1000;
export const SALE_REWARD_CENTS = 2500;

export async function createPartnerWithCommissionRewards(
  api: ApiClient,
  { programId }: { programId: string },
) {
  const groupId = createId({ prefix: "grp_" });

  const [leadReward, saleReward] = await Promise.all([
    prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId,
        event: EventType.lead,
        type: RewardStructure.flat,
        amountInCents: LEAD_REWARD_CENTS,
      },
    }),
    prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId,
        event: EventType.sale,
        type: RewardStructure.flat,
        amountInCents: SALE_REWARD_CENTS,
        maxDuration: 0,
      },
    }),
  ]);

  await prisma.partnerGroup.create({
    data: {
      id: groupId,
      programId,
      slug: `pw-cm-${nanoid(8).toLowerCase()}`,
      name: "Playwright Commissions",
      maxPartnerLinks: DEFAULT_ADDITIONAL_PARTNER_LINKS,
      leadRewardId: leadReward.id,
      saleRewardId: saleReward.id,
    },
  });

  await prisma.partnerGroupDefaultLink.create({
    data: {
      id: createId({ prefix: "pgdl_" }),
      programId,
      groupId,
      domain: TEST_WORKSPACE.program.domain,
      url: TEST_WORKSPACE.program.url,
    },
  });

  const created = await createPartner(api, {
    groupId,
  });

  return {
    ...created,
    groupId,
  };
}

export async function deleteCommissionPartner({
  partnerId,
  groupId,
}: {
  partnerId: string | undefined;
  groupId?: string;
}) {
  if (partnerId) {
    const links = await prisma.link.findMany({
      where: {
        partnerId,
      },
      select: {
        id: true,
      },
    });

    await prisma.customer.deleteMany({
      where: {
        OR: [
          { partnerId },
          ...(links.length > 0
            ? [{ linkId: { in: links.map((link) => link.id) } }]
            : []),
        ],
      },
    });
  }

  await deletePartner(partnerId);

  if (!groupId) {
    return;
  }

  const group = await prisma.partnerGroup.findUnique({
    where: {
      id: groupId,
    },
    select: {
      leadRewardId: true,
      saleRewardId: true,
    },
  });

  if (!group) {
    return;
  }

  await prisma.partnerGroupDefaultLink.deleteMany({
    where: {
      groupId,
    },
  });

  await prisma.partnerGroup.update({
    where: {
      id: groupId,
    },
    data: {
      leadRewardId: null,
      saleRewardId: null,
    },
  });

  await prisma.partnerGroup.delete({
    where: {
      id: groupId,
    },
  });

  const rewardIds = [group.leadRewardId, group.saleRewardId].filter(
    (id): id is string => id != null,
  );

  if (rewardIds.length > 0) {
    await prisma.reward.deleteMany({
      where: {
        id: {
          in: rewardIds,
        },
      },
    });
  }
}

export async function expectCommissionCreated({
  partnerId,
  programId,
  type,
  description,
  invoiceId,
  expectedAmount,
  expectedEarnings,
}: {
  partnerId: string;
  programId: string;
  type: "custom" | "lead" | "sale";
  description?: string;
  invoiceId?: string;
  expectedAmount: number;
  expectedEarnings: number;
}) {
  await expect
    .poll(async () => {
      const commission = await prisma.commission.findFirst({
        where: {
          partnerId,
          programId,
          type,
          ...(description ? { description } : {}),
          ...(invoiceId ? { invoiceId } : {}),
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!commission) {
        return null;
      }

      return {
        partnerId: commission.partnerId,
        programId: commission.programId,
        type: commission.type,
        amount: Number(commission.amount),
        earnings: Number(commission.earnings),
        quantity: commission.quantity,
        description: commission.description,
        invoiceId: commission.invoiceId,
      };
    })
    .toEqual({
      partnerId,
      programId,
      type,
      amount: expectedAmount,
      earnings: expectedEarnings,
      quantity: 1,
      description: description ?? null,
      invoiceId: invoiceId ?? null,
    });
}
