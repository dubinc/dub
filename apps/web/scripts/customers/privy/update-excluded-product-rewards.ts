import { reconcilePayoutAmounts } from "@/lib/api/commissions/reconcile-payout-amounts";
import { syncTotalCommissions } from "@/lib/api/partners/sync-total-commissions";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { MUTABLE_PAYOUT_STATUSES } from "@/lib/constants/payouts";
import { determinePartnerRewards } from "@/lib/partners/determine-partner-reward";
import { prisma } from "@/lib/prisma";
import { getSaleEvent } from "@/lib/tinybird/get-sale-event";
import { RewardConditionsArray } from "@/lib/types";
import { rewardConditionsArraySchema } from "@/lib/zod/schemas/rewards";
import {
  Commission,
  Reward,
  RewardStructure as RewardStructureEnum,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { differenceInMonths } from "date-fns";
import "dotenv-flow/config";

const WORKSPACE_ID = "ws_xxx";
const PROGRAM_ID = "prog_xxx";

const EXCLUDED_PRODUCT_IDS = [];

const DRY_RUN = !process.argv.includes("--execute");

type StripeInvoiceLine = {
  amount?: number;
  quantity?: number | null;
  pricing?: {
    price_details?: {
      product?: string;
    };
  };
  price?: {
    product?: string | { id?: string };
  };
};

type SaleProduct = {
  id: string;
  amount: number;
  quantity: number;
};

function isExclusionModifier(modifier: RewardConditionsArray[number]) {
  const amountIsZero =
    modifier.amountInCents === 0 || modifier.amountInPercentage === 0;

  return modifier.conditions.some(
    (condition) =>
      condition.entity === "sale" &&
      condition.attribute === "productId" &&
      condition.operator === "in" &&
      amountIsZero,
  );
}

function buildExclusionModifier(
  reward: Pick<Reward, "type">,
  productIds: string[],
  existingModifier?: RewardConditionsArray[number],
): RewardConditionsArray[number] {
  const modifier: RewardConditionsArray[number] = {
    id: existingModifier?.id ?? randomUUID(),
    operator: "AND",
    type: reward.type,
    conditions: [
      {
        entity: "sale",
        attribute: "productId",
        operator: "in",
        value: productIds,
      },
    ],
    maxDuration: null,
  };

  if (reward.type === RewardStructureEnum.percentage) {
    modifier.amountInPercentage = 0;
  } else {
    modifier.amountInCents = 0;
  }

  return modifier;
}

function mergeExcludedProductModifiers(
  reward: Reward,
  excludedProductIds: string[],
): RewardConditionsArray {
  const parsedModifiers = reward.modifiers
    ? rewardConditionsArraySchema.safeParse(reward.modifiers)
    : null;

  if (reward.modifiers && !parsedModifiers?.success) {
    throw new Error(
      `Reward ${reward.id} has invalid modifiers JSON. Fix manually before running.`,
    );
  }

  const modifiers = parsedModifiers?.success ? [...parsedModifiers.data] : [];
  const existingIndex = modifiers.findIndex(isExclusionModifier);
  const existingModifier =
    existingIndex >= 0 ? modifiers[existingIndex] : undefined;

  const existingCondition = existingModifier?.conditions.find(
    (condition) =>
      condition.entity === "sale" &&
      condition.attribute === "productId" &&
      condition.operator === "in" &&
      Array.isArray(condition.value),
  );

  const existingIds = Array.isArray(existingCondition?.value)
    ? existingCondition.value.map(String)
    : [];

  const mergedProductIds = [
    ...new Set([...existingIds, ...excludedProductIds]),
  ];

  const exclusionModifier = buildExclusionModifier(
    reward,
    mergedProductIds,
    existingModifier,
  );

  if (existingIndex >= 0) {
    modifiers[existingIndex] = exclusionModifier;
  } else {
    modifiers.push(exclusionModifier);
  }

  return modifiers;
}

function parseInvoiceLineProducts(lines: StripeInvoiceLine[]): SaleProduct[] {
  return lines
    .map((line) => {
      const productId =
        line.pricing?.price_details?.product ??
        (typeof line.price?.product === "string"
          ? line.price.product
          : line.price?.product?.id);

      if (!productId) {
        return null;
      }

      return {
        id: productId,
        amount: line.amount ?? 0,
        quantity: line.quantity ?? 1,
      };
    })
    .filter((product): product is SaleProduct => product !== null);
}

function parseSaleProductsFromMetadata(
  metadata: string,
  commissionAmount: number,
): SaleProduct[] {
  try {
    const parsed = JSON.parse(metadata) as {
      invoice?: { lines?: { data?: StripeInvoiceLine[] } };
      productId?: string;
    };

    const lines = parsed.invoice?.lines?.data ?? [];

    if (lines.length > 0) {
      const fromInvoice = parseInvoiceLineProducts(lines);
      if (fromInvoice.length > 0) {
        return fromInvoice;
      }

      // Invoice metadata present but line items could not be parsed — do not
      // fall back to a bare productId, which would misrepresent multi-line sales.
      return [];
    }

    if (parsed.productId && commissionAmount > 0) {
      return [
        {
          id: parsed.productId,
          amount: commissionAmount,
          quantity: 1,
        },
      ];
    }

    return [];
  } catch {
    return [];
  }
}

async function getSaleProductsForCommission(
  commission: Pick<Commission, "eventId" | "invoiceId" | "amount">,
): Promise<SaleProduct[]> {
  if (!commission.eventId) {
    return [];
  }

  try {
    const { data } = await getSaleEvent({ eventId: commission.eventId });

    if (data.length === 0 || !data[0].metadata) {
      return [];
    }

    return parseSaleProductsFromMetadata(data[0].metadata, commission.amount);
  } catch (error) {
    console.warn(
      `get_sale_event failed for ${commission.eventId}: ${error instanceof Error ? error.message : error}`,
    );
    return [];
  }
}

async function recalculateSaleCommissionEarnings({
  commission,
  excludedProductIds,
}: {
  commission: Commission & {
    customer: {
      country: string | null;
      createdAt: Date;
    } | null;
  };
  excludedProductIds: Set<string>;
}) {
  const products = await getSaleProductsForCommission(commission);

  if (products.length === 0) {
    return {
      products,
      newEarnings: null,
      reason: "no_products_found",
    };
  }

  const eligibleProducts = products.filter(
    (product) => !excludedProductIds.has(product.id),
  );

  if (eligibleProducts.length === 0) {
    return {
      products,
      newEarnings: 0,
      reason: "all_products_excluded",
    };
  }

  const eligibleAmount = eligibleProducts.reduce(
    (sum, product) => sum + product.amount,
    0,
  );

  if (eligibleAmount === 0) {
    return {
      products,
      newEarnings: null,
      reason: "no_eligible_amount",
    };
  }

  const programEnrollment = await prisma.programEnrollment.findUnique({
    where: {
      partnerId_programId: {
        partnerId: commission.partnerId,
        programId: commission.programId,
      },
    },
    include: {
      partner: true,
      links: true,
      saleReward: true,
    },
  });

  if (!programEnrollment?.saleReward) {
    return {
      products,
      newEarnings: null,
      reason: "no_sale_reward",
    };
  }

  const firstCommission = await prisma.commission.findFirst({
    where: {
      programId: commission.programId,
      partnerId: commission.partnerId,
      customerId: commission.customerId,
      type: "sale",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      createdAt: true,
    },
  });

  const subscriptionStartDate =
    firstCommission?.createdAt ?? commission.createdAt;
  const subscriptionDurationMonths = differenceInMonths(
    commission.createdAt,
    subscriptionStartDate,
  );

  const rewards = determinePartnerRewards({
    event: "sale",
    programEnrollment,
    amount: eligibleAmount,
    quantity: commission.quantity,
    context: {
      customer: {
        country: commission.customer?.country ?? undefined,
        signupDate: commission.customer?.createdAt,
        subscriptionStartDate,
        subscriptionDurationMonths,
      },
      sale: {
        products: eligibleProducts,
        amount: eligibleAmount,
        type: firstCommission?.id === commission.id ? "new" : "recurring",
      },
    },
  });

  const newEarnings = rewards.reduce(
    (sum, { reward, sale }) =>
      sum +
      calculateSaleEarnings({
        reward,
        sale,
      }),
    0,
  );

  return {
    products,
    newEarnings,
    reason: "recalculated",
  };
}

async function updateRewards(excludedProductIds: string[]) {
  const groups = await prisma.partnerGroup.findMany({
    where: {
      programId: PROGRAM_ID,
    },
    select: {
      id: true,
      name: true,
      saleRewardId: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  const enrollmentSaleRewardIds = await prisma.programEnrollment.findMany({
    where: {
      programId: PROGRAM_ID,
      saleRewardId: {
        not: null,
      },
    },
    select: {
      saleRewardId: true,
    },
    distinct: ["saleRewardId"],
  });

  const rewardIds = [
    ...new Set(
      [
        ...groups.map((group) => group.saleRewardId),
        ...enrollmentSaleRewardIds.map((enrollment) => enrollment.saleRewardId),
      ].filter((rewardId): rewardId is string => Boolean(rewardId)),
    ),
  ];

  if (rewardIds.length === 0) {
    throw new Error("No sale rewards found for program groups.");
  }

  const rewards = await prisma.reward.findMany({
    where: {
      id: {
        in: rewardIds,
      },
      programId: PROGRAM_ID,
      event: "sale",
    },
  });

  console.log(
    `Found ${groups.length} groups and ${rewards.length} unique sale rewards to update`,
  );

  for (const reward of rewards) {
    const linkedGroups = groups.filter(
      (group) => group.saleRewardId === reward.id,
    );
    const newModifiers = mergeExcludedProductModifiers(
      reward,
      excludedProductIds,
    );

    console.log(
      `Reward ${reward.id} (${reward.type}) used by groups: ${linkedGroups
        .map((group) => group.name)
        .join(", ")}`,
    );

    if (DRY_RUN) {
      const exclusionModifier = newModifiers.find(isExclusionModifier);
      const excludedCount = Array.isArray(
        exclusionModifier?.conditions[0]?.value,
      )
        ? exclusionModifier.conditions[0].value.length
        : 0;
      console.log(
        `[dry-run] Would update reward ${reward.id} with ${excludedCount} excluded product IDs`,
      );
      continue;
    }

    await prisma.reward.update({
      where: {
        id: reward.id,
      },
      data: {
        modifiers: newModifiers,
      },
    });

    console.log(`Updated reward ${reward.id}`);
  }
}

async function updateCommissions(excludedProductIds: Set<string>) {
  const commissions = await prisma.commission.findMany({
    where: {
      programId: PROGRAM_ID,
      type: "sale",
      status: {
        in: ["pending", "processed"],
      },
      earnings: {
        gt: 0,
      },
    },
    include: {
      customer: {
        select: {
          country: true,
          createdAt: true,
        },
      },
      payout: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  console.log(
    `Found ${commissions.length} unpaid sale commissions with earnings > 0`,
  );

  const toCancel: Commission[] = [];
  const toUpdate: Array<{ commission: Commission; newEarnings: number }> = [];
  const skipped: Array<{ commissionId: string; reason: string }> = [];

  for (const [index, commission] of commissions.entries()) {
    if (index % 25 === 0) {
      console.log(`Processing commission ${index + 1}/${commissions.length}`);
    }

    if (
      commission.payout &&
      !MUTABLE_PAYOUT_STATUSES.includes(commission.payout.status)
    ) {
      skipped.push({
        commissionId: commission.id,
        reason: `payout_${commission.payout.status}`,
      });
      continue;
    }

    const result = await recalculateSaleCommissionEarnings({
      commission,
      excludedProductIds,
    });

    if (result.newEarnings === null) {
      skipped.push({
        commissionId: commission.id,
        reason: result.reason,
      });
      continue;
    }

    if (result.newEarnings === 0) {
      toCancel.push(commission);
      continue;
    }

    if (result.newEarnings < commission.earnings) {
      toUpdate.push({
        commission,
        newEarnings: result.newEarnings,
      });
    }
  }

  console.log(
    `Commission plan: cancel ${toCancel.length}, update ${toUpdate.length}, skip ${skipped.length}`,
  );

  if (skipped.length > 0) {
    console.table(skipped.slice(0, 20));
    if (skipped.length > 20) {
      console.log(`... and ${skipped.length - 20} more skipped commissions`);
    }
  }

  if (toCancel.length > 0) {
    console.table(
      toCancel.slice(0, 20).map((commission) => ({
        id: commission.id,
        partnerId: commission.partnerId,
        earnings: commission.earnings,
        status: commission.status,
        payoutId: commission.payoutId,
        invoiceId: commission.invoiceId,
      })),
    );
  }

  if (toUpdate.length > 0) {
    console.table(
      toUpdate.slice(0, 20).map(({ commission, newEarnings }) => ({
        id: commission.id,
        partnerId: commission.partnerId,
        oldEarnings: commission.earnings,
        newEarnings,
        status: commission.status,
        payoutId: commission.payoutId,
        invoiceId: commission.invoiceId,
      })),
    );
  }

  if (DRY_RUN) {
    console.log("[dry-run] Skipping commission updates");
    return {
      partnerIds: [
        ...new Set([
          ...toCancel.map((commission) => commission.partnerId),
          ...toUpdate.map(({ commission }) => commission.partnerId),
        ]),
      ],
      payoutIds: [
        ...new Set(
          [...toCancel, ...toUpdate.map(({ commission }) => commission)]
            .map((commission) => commission.payoutId)
            .filter((payoutId): payoutId is string => Boolean(payoutId)),
        ),
      ],
    };
  }

  const affectedCommissionIds = [
    ...toCancel.map((commission) => commission.id),
    ...toUpdate.map(({ commission }) => commission.id),
  ];

  if (affectedCommissionIds.length > 0) {
    await prisma.commission.updateMany({
      where: {
        id: {
          in: toCancel.map((commission) => commission.id),
        },
        status: {
          in: ["pending", "processed"],
        },
      },
      data: {
        status: "canceled",
        payoutId: null,
      },
    });

    for (const { commission, newEarnings } of toUpdate) {
      await prisma.commission.update({
        where: {
          id: commission.id,
          status: {
            in: ["pending", "processed"],
          },
        },
        data: {
          earnings: newEarnings,
        },
      });
    }
  }

  const payoutIds = [
    ...new Set(
      [...toCancel, ...toUpdate.map(({ commission }) => commission)]
        .map((commission) => commission.payoutId)
        .filter((payoutId): payoutId is string => Boolean(payoutId)),
    ),
  ];

  if (payoutIds.length > 0) {
    await reconcilePayoutAmounts(payoutIds);
  }

  const partnerIds = [
    ...new Set([
      ...toCancel.map((commission) => commission.partnerId),
      ...toUpdate.map(({ commission }) => commission.partnerId),
    ]),
  ];

  for (const partnerId of partnerIds) {
    await syncTotalCommissions({
      partnerId,
      programId: PROGRAM_ID,
    });
  }

  return {
    partnerIds,
    payoutIds,
  };
}

async function main() {
  const excludedProductIds = [...new Set(EXCLUDED_PRODUCT_IDS)];
  const excludedProductIdSet = new Set(excludedProductIds);

  if (excludedProductIds.length === 0) {
    throw new Error(
      "Set at least one excluded Stripe product ID before running.",
    );
  }

  const program = await prisma.program.findFirst({
    where: {
      id: PROGRAM_ID,
      workspaceId: WORKSPACE_ID,
    },
    select: {
      id: true,
      name: true,
      workspace: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!program) {
    throw new Error(
      `Program ${PROGRAM_ID} not found for workspace ${WORKSPACE_ID}`,
    );
  }

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Updating program ${program.name} (${program.id}) in workspace ${program.workspace.slug}`,
  );
  console.log(`Excluding ${excludedProductIds.length} Stripe product IDs`);

  await updateRewards(excludedProductIds);
  await updateCommissions(excludedProductIdSet);

  console.log("Done.");
}

if (process.argv[1]?.includes("update-excluded-product-rewards")) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
