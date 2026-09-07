import { prisma } from "@/lib/prisma";
import type {
  CommissionResponse,
  EnrolledPartnerProps,
  LinkProps,
  RewardConditionsArray,
} from "@/lib/types";
import { expect } from "@playwright/test";
import { EventType, Prisma, RewardStructure } from "@prisma/client";
import { deleteCommissionPartner } from "../commissions/helpers";
import { trackClick, trackLead, trackSale } from "../conversions/helpers";
import { test, type ApiClient } from "../fixtures";
import { createPartner } from "../partners/helpers";
import { createReward, deleteReward, updateReward } from "./helpers";

const BASE_AMOUNT = 100;
const MODIFIER_AMOUNT = 500;
const SALE_AMOUNT = 1000;

type SaleRewardCtx = {
  api: ApiClient;
  partnerId: string;
  programId: string;
  workspaceId: string;
  link: Pick<LinkProps, "id" | "domain" | "key">;
};

const bookTitleMetadataModifier: RewardConditionsArray = [
  {
    operator: "AND",
    type: RewardStructure.flat,
    amountInCents: MODIFIER_AMOUNT,
    conditions: [
      {
        entity: "sale",
        attribute: "metadata",
        metadataField: "bookTitle",
        operator: "equals_to",
        value: "THGTTG",
      },
    ],
  },
];

function modifier(
  conditions: RewardConditionsArray[number]["conditions"],
  amountInCents = MODIFIER_AMOUNT,
): RewardConditionsArray {
  return [
    {
      operator: "AND",
      type: RewardStructure.flat,
      amountInCents,
      conditions,
    },
  ];
}

async function resetPartnerState(
  ctx: SaleRewardCtx,
  { country = "US" }: { country?: string } = {},
) {
  await prisma.partner.update({
    where: {
      id: ctx.partnerId,
    },
    data: {
      country,
    },
  });

  await prisma.link.update({
    where: {
      id: ctx.link.id,
    },
    data: {
      clicks: 0,
      leads: 0,
      conversions: 0,
      sales: 0,
      saleAmount: 0,
    },
  });

  await prisma.programEnrollment.update({
    where: {
      partnerId_programId: {
        partnerId: ctx.partnerId,
        programId: ctx.programId,
      },
    },
    data: {
      totalCommissions: 0,
    },
  });
}

async function trackPartnerSale(
  ctx: SaleRewardCtx,
  overrides: Record<string, unknown> = {},
): Promise<{
  customerExternalId: string;
  invoiceId: string;
  amount: number;
}> {
  const customerExternalIdOverride = overrides.customerExternalId as
    | string
    | undefined;
  const saleOverrides = { ...overrides };
  delete saleOverrides.customerExternalId;
  delete saleOverrides.customerEmail;
  delete saleOverrides.customerName;

  const { clickId } = await trackClick({
    domain: ctx.link.domain,
    key: ctx.link.key,
  });

  const { customer } = await trackLead({
    clickId,
    eventName: "Signup",
    ...(customerExternalIdOverride
      ? {
          customerExternalId: customerExternalIdOverride,
          customerEmail: overrides.customerEmail,
          customerName: overrides.customerName,
        }
      : {}),
  });

  const customerExternalId = customerExternalIdOverride ?? customer.externalId;

  const { invoiceId, amount } = await trackSale({
    customerExternalId,
    amount: SALE_AMOUNT,
    ...saleOverrides,
  });

  return {
    customerExternalId,
    invoiceId,
    amount,
  };
}

async function trackSaleForCustomer(
  ctx: SaleRewardCtx,
  {
    customerExternalId,
    ...overrides
  }: {
    customerExternalId: string;
  } & Record<string, unknown>,
): Promise<{ invoiceId: string; amount: number }> {
  return trackSale({
    customerExternalId,
    amount: SALE_AMOUNT,
    ...overrides,
  });
}

async function expectSaleCommission(
  ctx: SaleRewardCtx,
  {
    invoiceId,
    expectedEarnings,
    expectedMetadata,
  }: {
    invoiceId: string;
    expectedEarnings: number;
    expectedMetadata?: Record<string, unknown> | null;
  },
) {
  await expect
    .poll(async () => {
      const commission = await prisma.commission.findFirst({
        where: {
          partnerId: ctx.partnerId,
          programId: ctx.programId,
          type: "sale",
          invoiceId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      if (!commission) {
        return null;
      }

      return {
        earnings: Number(commission.earnings),
        metadata: commission.metadata,
      };
    })
    .toEqual({
      earnings: expectedEarnings,
      metadata: expectedMetadata === undefined ? null : expectedMetadata,
    });

  const listQuery = new URLSearchParams({
    partnerId: ctx.partnerId,
    type: "sale",
    invoiceId,
  });

  const { status, data: commissions } = await ctx.api.get<CommissionResponse[]>(
    `/api/commissions?${listQuery}`,
  );

  expect(status).toEqual(200);
  expect(commissions.length).toBeGreaterThan(0);
  expect(commissions[0]).toMatchObject({
    type: "sale",
    earnings: expectedEarnings,
    invoiceId,
    ...(expectedMetadata !== undefined ? { metadata: expectedMetadata } : {}),
  });
}

async function expectNoSaleCommission(
  ctx: SaleRewardCtx,
  { invoiceId }: { invoiceId: string },
) {
  // Give the create-partner-commission workflow time to run (and skip).
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  const commission = await prisma.commission.findFirst({
    where: {
      partnerId: ctx.partnerId,
      programId: ctx.programId,
      type: "sale",
      invoiceId,
    },
  });

  expect(commission).toBeNull();
}

async function expectSaleCommissionCount(
  ctx: SaleRewardCtx,
  {
    customerExternalId,
    count,
  }: {
    customerExternalId: string;
    count: number;
  },
) {
  const customer = await prisma.customer.findUniqueOrThrow({
    where: {
      projectId_externalId: {
        projectId: ctx.workspaceId,
        externalId: customerExternalId,
      },
    },
  });

  // Give a follow-up create-partner-commission workflow time to run (or skip).
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  await expect
    .poll(async () => {
      return prisma.commission.count({
        where: {
          partnerId: ctx.partnerId,
          programId: ctx.programId,
          type: "sale",
          customerId: customer.id,
        },
      });
    })
    .toEqual(count);
}

test.describe("Sale rewards", () => {
  // Shared reward + enrollment; serial so modifiers can be updated between tests.
  // No retries: a failed case leaves shared reward/partner state that would flake on retry.
  test.describe.configure({ mode: "serial", retries: 0 });

  let rewardId: string | undefined;
  let ctx: SaleRewardCtx | undefined;

  test.beforeAll(async ({ api, program, workspace }) => {
    const reward = await createReward({
      programId: program.id,
      event: EventType.sale,
      type: RewardStructure.flat,
      amountInCents: BASE_AMOUNT,
      maxDuration: null,
    });

    const { data } = await createPartner(api, {
      groupId: program.defaultGroupId,
      country: "US",
    });

    const partner = data as EnrolledPartnerProps;
    expect(partner.links?.[0]).toBeTruthy();

    rewardId = reward.id;
    ctx = {
      api,
      partnerId: partner.id,
      programId: program.id,
      workspaceId: workspace.id,
      link: partner.links![0],
    };

    // Detach default group rewards so the first test has none, and so
    // track/lead does not enqueue a lead commission before sale jobs.
    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      data: {
        saleRewardId: null,
        leadRewardId: null,
      },
    });
  });

  test.afterAll(async () => {
    await deleteCommissionPartner({ partnerId: ctx?.partnerId });
    await deleteReward(rewardId);
  });

  test("no sale reward skips commission creation", async () => {
    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectNoSaleCommission(ctx!, { invoiceId });
  });

  test("base reward with no conditions uses base amount", async () => {
    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: ctx!.partnerId,
          programId: ctx!.programId,
        },
      },
      data: {
        saleRewardId: rewardId!,
      },
    });

    await updateReward(rewardId!, {
      modifiers: Prisma.JsonNull,
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("does not create a second sale commission when maxDuration is 0", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: Prisma.JsonNull,
      maxDuration: 0,
    });

    const { customerExternalId, invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });

    await trackSaleForCustomer(ctx!, { customerExternalId });
    await expectSaleCommissionCount(ctx!, {
      customerExternalId,
      count: 1,
    });

    await updateReward(rewardId!, {
      maxDuration: null,
    });
  });

  test("customer source equals_to tracked matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "source",
          operator: "equals_to",
          value: "tracked",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer source equals_to submitted misses and uses base", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "source",
          operator: "equals_to",
          value: "submitted",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("customer country equals_to US matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer country equals_to SG matches after updating customer country", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "SG",
        },
      ]),
    });

    // track/sale requires customer.linkId; POST /api/customers alone leaves it
    // null. Create via click+lead, then override country before the sale.
    const { clickId } = await trackClick({
      domain: ctx!.link.domain,
      key: ctx!.link.key,
    });
    const { customer } = await trackLead({
      clickId,
      eventName: "Signup",
    });

    await prisma.customer.update({
      where: {
        projectId_externalId: {
          projectId: ctx!.workspaceId,
          externalId: customer.externalId,
        },
      },
      data: {
        country: "SG",
      },
    });

    const { invoiceId } = await trackSale({
      customerExternalId: customer.externalId,
      amount: SALE_AMOUNT,
    });

    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer signupDate window matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "signupDate",
          operator: "greater_than",
          value: new Date("2026-02-16T00:00:00.000Z").getTime(),
        },
        {
          entity: "customer",
          attribute: "signupDate",
          operator: "less_than",
          value: new Date("2026-02-18T00:00:00.000Z").getTime(),
        },
      ]),
    });

    const { clickId } = await trackClick({
      domain: ctx!.link.domain,
      key: ctx!.link.key,
    });
    const { customer } = await trackLead({
      clickId,
      eventName: "Signup",
    });

    await prisma.customer.update({
      where: {
        projectId_externalId: {
          projectId: ctx!.workspaceId,
          externalId: customer.externalId,
        },
      },
      data: {
        createdAt: new Date("2026-02-17T00:00:00.000Z"),
      },
    });

    const { invoiceId } = await trackSale({
      customerExternalId: customer.externalId,
      amount: SALE_AMOUNT,
    });

    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer signupDate window misses for current signup", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "signupDate",
          operator: "greater_than",
          value: new Date("2026-02-16T00:00:00.000Z").getTime(),
        },
        {
          entity: "customer",
          attribute: "signupDate",
          operator: "less_than",
          value: new Date("2026-02-18T00:00:00.000Z").getTime(),
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("customer subscriptionDurationMonths less_than_or_equal 3 matches first sale", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "subscriptionDurationMonths",
          operator: "less_than_or_equal",
          value: 3,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer subscriptionDurationMonths less_than_or_equal 3 misses after 4 months", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "subscriptionDurationMonths",
          operator: "less_than_or_equal",
          value: 3,
        },
      ]),
    });

    const { customerExternalId, invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });

    const fourMonthsAgo = new Date();
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);

    await prisma.commission.updateMany({
      where: {
        partnerId: ctx!.partnerId,
        programId: ctx!.programId,
        type: "sale",
        invoiceId,
      },
      data: {
        createdAt: fourMonthsAgo,
      },
    });

    const second = await trackSaleForCustomer(ctx!, { customerExternalId });
    await expectSaleCommission(ctx!, {
      invoiceId: second.invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("customer subscriptionStartDate greater_than recent cutoff matches", async () => {
    await resetPartnerState(ctx!);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "subscriptionStartDate",
          operator: "greater_than",
          value: cutoff,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer subscriptionStartDate greater_than future cutoff misses", async () => {
    await resetPartnerState(ctx!);
    const cutoff = Date.now() + 24 * 60 * 60 * 1000;
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "subscriptionStartDate",
          operator: "greater_than",
          value: cutoff,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("partner country equals_to US matches", async () => {
    await resetPartnerState(ctx!, { country: "US" });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("partner country equals_to US misses for SG partner", async () => {
    await resetPartnerState(ctx!, { country: "SG" });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "country",
          operator: "equals_to",
          value: "US",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("partner totalClicks greater_than matches seeded clicks", async () => {
    await resetPartnerState(ctx!);
    await prisma.link.update({
      where: {
        id: ctx!.link.id,
      },
      data: {
        clicks: 50,
      },
    });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalClicks",
          operator: "greater_than",
          value: 40,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("partner totalClicks greater_than misses when clicks are zero", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalClicks",
          operator: "greater_than",
          value: 50,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("partner totalLeads greater_than matches seeded leads", async () => {
    await resetPartnerState(ctx!);
    await prisma.link.update({
      where: {
        id: ctx!.link.id,
      },
      data: {
        leads: 50,
      },
    });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalLeads",
          operator: "greater_than",
          value: 40,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("partner totalConversions greater_than matches seeded conversions", async () => {
    await resetPartnerState(ctx!);
    await prisma.link.update({
      where: {
        id: ctx!.link.id,
      },
      data: {
        conversions: 50,
      },
    });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalConversions",
          operator: "greater_than",
          value: 40,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("partner totalSaleAmount greater_than matches seeded saleAmount", async () => {
    await resetPartnerState(ctx!);
    await prisma.link.update({
      where: {
        id: ctx!.link.id,
      },
      data: {
        saleAmount: 50_00,
      },
    });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalSaleAmount",
          operator: "greater_than",
          value: 40_00,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("partner totalCommissions greater_than matches seeded enrollment total", async () => {
    await resetPartnerState(ctx!);
    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: ctx!.partnerId,
          programId: ctx!.programId,
        },
      },
      data: {
        totalCommissions: 50_00,
      },
    });
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "partner",
          attribute: "totalCommissions",
          operator: "greater_than",
          value: 40_00,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("sale productId equals_to premiumProductId matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "premiumProductId",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!, {
      metadata: {
        productId: "premiumProductId",
      },
    });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
      expectedMetadata: {
        productId: "premiumProductId",
      },
    });
  });

  test("sale productId equals_to premiumProductId misses for regularProductId", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "productId",
          operator: "equals_to",
          value: "premiumProductId",
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!, {
      metadata: {
        productId: "regularProductId",
      },
    });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
      expectedMetadata: {
        productId: "regularProductId",
      },
    });
  });

  test("sale amount greater_than 15000 matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than",
          value: 15000,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!, {
      amount: 17500,
    });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("sale amount greater_than 15000 misses for default amount", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "amount",
          operator: "greater_than",
          value: 15000,
        },
      ]),
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("sale type equals_to new matches first sale and misses recurring", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "type",
          operator: "equals_to",
          value: "new",
        },
      ]),
    });

    const { customerExternalId, invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });

    const second = await trackSaleForCustomer(ctx!, { customerExternalId });
    await expectSaleCommission(ctx!, {
      invoiceId: second.invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("sale type equals_to recurring misses first sale and matches second", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "sale",
          attribute: "type",
          operator: "equals_to",
          value: "recurring",
        },
      ]),
    });

    const { customerExternalId, invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });

    const second = await trackSaleForCustomer(ctx!, { customerExternalId });
    await expectSaleCommission(ctx!, {
      invoiceId: second.invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("sale metadata bookTitle equals_to THGTTG matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: bookTitleMetadataModifier,
    });

    const metadata = { bookTitle: "THGTTG" };
    const { invoiceId } = await trackPartnerSale(ctx!, { metadata });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: MODIFIER_AMOUNT,
      expectedMetadata: metadata,
    });
  });

  test("sale metadata bookTitle equals_to THGTTG misses without metadata", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: bookTitleMetadataModifier,
    });

    const { invoiceId } = await trackPartnerSale(ctx!);
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("when sale productId is premium and amount is greater than 15000", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 200,
          conditions: [
            {
              entity: "sale",
              attribute: "productId",
              operator: "equals_to",
              value: "premiumProductId",
            },
          ],
        },
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 300,
          conditions: [
            {
              entity: "sale",
              attribute: "amount",
              operator: "greater_than",
              value: 15000,
            },
          ],
        },
      ],
    });

    const { invoiceId } = await trackPartnerSale(ctx!, {
      amount: 17500,
      metadata: {
        productId: "premiumProductId",
      },
    });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: 300,
      expectedMetadata: {
        productId: "premiumProductId",
      },
    });
  });

  test("when sale productId is premium and amount is not greater than 15000", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 200,
          conditions: [
            {
              entity: "sale",
              attribute: "productId",
              operator: "equals_to",
              value: "premiumProductId",
            },
          ],
        },
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 300,
          conditions: [
            {
              entity: "sale",
              attribute: "amount",
              operator: "greater_than",
              value: 15000,
            },
          ],
        },
      ],
    });

    const { invoiceId } = await trackPartnerSale(ctx!, {
      amount: SALE_AMOUNT,
      metadata: {
        productId: "premiumProductId",
      },
    });
    await expectSaleCommission(ctx!, {
      invoiceId,
      expectedEarnings: 200,
      expectedMetadata: {
        productId: "premiumProductId",
      },
    });
  });
});
