import { prisma } from "@/lib/prisma";
import type {
  CommissionResponse,
  Customer,
  EnrolledPartnerProps,
  LinkProps,
  RewardConditionsArray,
} from "@/lib/types";
import { expect } from "@playwright/test";
import { EventType, Prisma, RewardStructure } from "@prisma/client";
import { randomCustomer } from "../../utils";
import { deleteCommissionPartner } from "../commissions/helpers";
import { trackClick, trackLead } from "../conversions/helpers";
import { test, type ApiClient } from "../fixtures";
import { createPartner } from "../partners/helpers";
import { createReward, deleteReward, updateReward } from "./helpers";

const BASE_AMOUNT = 100;
const MODIFIER_AMOUNT = 500;

type LeadRewardCtx = {
  api: ApiClient;
  partnerId: string;
  programId: string;
  workspaceId: string;
  link: Pick<LinkProps, "id" | "domain" | "key">;
};

const planProMetadataModifier: RewardConditionsArray = [
  {
    operator: "AND",
    type: RewardStructure.flat,
    amountInCents: MODIFIER_AMOUNT,
    conditions: [
      {
        entity: "lead",
        attribute: "metadata",
        metadataField: "plan",
        operator: "equals_to",
        value: "pro",
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
  ctx: LeadRewardCtx,
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

async function trackPartnerLead(
  ctx: LeadRewardCtx,
  overrides: Record<string, unknown> = {},
): Promise<{ customerExternalId: string }> {
  const { clickId } = await trackClick({
    domain: ctx.link.domain,
    key: ctx.link.key,
  });

  const { customer } = await trackLead({
    clickId,
    eventName: "Signup",
    ...overrides,
  });

  return {
    customerExternalId:
      (overrides.customerExternalId as string | undefined) ??
      customer.externalId,
  };
}

async function expectLeadCommission(
  ctx: LeadRewardCtx,
  {
    customerExternalId,
    expectedEarnings,
    expectedMetadata,
  }: {
    customerExternalId: string;
    expectedEarnings: number;
    expectedMetadata?: Record<string, unknown> | null;
  },
) {
  let customerId: string | undefined;

  await expect
    .poll(async () => {
      const customer = await prisma.customer.findUnique({
        where: {
          projectId_externalId: {
            projectId: ctx.workspaceId,
            externalId: customerExternalId,
          },
        },
      });

      if (!customer) {
        return null;
      }

      customerId = customer.id;

      const commission = await prisma.commission.findFirst({
        where: {
          partnerId: ctx.partnerId,
          programId: ctx.programId,
          type: "lead",
          customerId,
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
    type: "lead",
    customerId: customerId!,
  });

  const { status, data: commissions } = await ctx.api.get<CommissionResponse[]>(
    `/api/commissions?${listQuery}`,
  );

  expect(status).toEqual(200);
  expect(commissions.length).toBeGreaterThan(0);
  expect(commissions[0]).toMatchObject({
    type: "lead",
    earnings: expectedEarnings,
    ...(expectedMetadata !== undefined ? { metadata: expectedMetadata } : {}),
  });
}

async function expectNoCommission(
  ctx: LeadRewardCtx,
  { customerExternalId }: { customerExternalId: string },
) {
  // Give the create-partner-commission workflow time to run (and skip).
  await new Promise((resolve) => setTimeout(resolve, 5_000));

  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: ctx.workspaceId,
        externalId: customerExternalId,
      },
    },
  });

  expect(customer).toBeTruthy();

  const commission = await prisma.commission.findFirst({
    where: {
      partnerId: ctx.partnerId,
      programId: ctx.programId,
      type: "lead",
      customerId: customer!.id,
    },
  });

  expect(commission).toBeNull();
}

async function expectLeadCommissionCount(
  ctx: LeadRewardCtx,
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
          type: "lead",
          customerId: customer.id,
        },
      });
    })
    .toEqual(count);
}

test.describe("Lead rewards", () => {
  // Shared reward + enrollment; serial so modifiers can be updated between tests.
  test.describe.configure({ mode: "serial" });

  let rewardId: string | undefined;
  let ctx: LeadRewardCtx | undefined;

  test.beforeAll(async ({ api, program, workspace }) => {
    const reward = await createReward({
      programId: program.id,
      event: EventType.lead,
      type: RewardStructure.flat,
      amountInCents: BASE_AMOUNT,
      maxDuration: 0,
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

    // Detach the default group's lead reward so the first test has none.
    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: program.id,
        },
      },
      data: {
        leadRewardId: null,
      },
    });
  });

  test.afterAll(async () => {
    await deleteCommissionPartner({ partnerId: ctx?.partnerId });
    await deleteReward(rewardId);
  });

  test("no lead reward skips commission creation", async () => {
    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectNoCommission(ctx!, { customerExternalId });
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
        leadRewardId: rewardId!,
      },
    });

    await updateReward(rewardId!, {
      modifiers: Prisma.JsonNull,
    });

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("does not create a second lead commission for the same customer and partner", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: Prisma.JsonNull,
    });

    const customer = randomCustomer();
    const { customerExternalId } = await trackPartnerLead(ctx!, {
      eventName: "Signup",
      customerExternalId: customer.externalId,
      customerEmail: customer.email,
      customerName: customer.name,
    });
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: BASE_AMOUNT,
    });

    // Different eventName so /track/lead is not Redis-deduped; commission
    // workflow should still skip because a lead commission already exists.
    await trackPartnerLead(ctx!, {
      eventName: "Requested demo",
      customerExternalId: customer.externalId,
      customerEmail: customer.email,
      customerName: customer.name,
    });
    await expectLeadCommissionCount(ctx!, {
      customerExternalId,
      count: 1,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("customer country equals_to CA matches pre-created customer", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: modifier([
        {
          entity: "customer",
          attribute: "country",
          operator: "equals_to",
          value: "CA",
        },
      ]),
    });

    const customer = randomCustomer();
    const { status } = await ctx!.api.post<Customer>("/api/customers", {
      ...customer,
      country: "CA",
    });
    expect(status).toEqual(201);

    const { customerExternalId } = await trackPartnerLead(ctx!, {
      customerExternalId: customer.externalId,
      customerEmail: customer.email,
      customerName: customer.name,
    });

    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: MODIFIER_AMOUNT,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
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

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: MODIFIER_AMOUNT,
    });
  });

  test("lead metadata plan equals_to pro matches", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: planProMetadataModifier,
    });

    const metadata = { plan: "pro" };
    const { customerExternalId } = await trackPartnerLead(ctx!, { metadata });
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: MODIFIER_AMOUNT,
      expectedMetadata: metadata,
    });
  });

  test("lead metadata plan equals_to pro misses without metadata", async () => {
    await resetPartnerState(ctx!);
    await updateReward(rewardId!, {
      modifiers: planProMetadataModifier,
    });

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: BASE_AMOUNT,
    });
  });

  test("when customer country is US and partner country is US", async () => {
    await resetPartnerState(ctx!, { country: "US" });
    await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 200,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 300,
          conditions: [
            {
              entity: "partner",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
      ],
    });

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: 300,
    });
  });

  test("when customer country is US and partner country is not US", async () => {
    await resetPartnerState(ctx!, { country: "SG" });
    await updateReward(rewardId!, {
      modifiers: [
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 200,
          conditions: [
            {
              entity: "customer",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
        {
          operator: "AND",
          type: RewardStructure.flat,
          amountInCents: 300,
          conditions: [
            {
              entity: "partner",
              attribute: "country",
              operator: "equals_to",
              value: "US",
            },
          ],
        },
      ],
    });

    const { customerExternalId } = await trackPartnerLead(ctx!);
    await expectLeadCommission(ctx!, {
      customerExternalId,
      expectedEarnings: 200,
    });
  });
});
