import { createId } from "@/lib/api/create-id";
import { conn } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import type { CommissionResponse, EnrolledPartnerProps } from "@/lib/types";
import { expect } from "@playwright/test";
import { Prisma } from "@prisma/client";
import { randomCustomer, randomName, randomPartnerEmail } from "../../utils";
import { test, type ApiClient } from "../fixtures";

test.describe.configure({
  mode: "parallel",
});

async function createPartner(
  api: ApiClient,
  overrides: Record<string, unknown> = {},
) {
  return api.post<EnrolledPartnerProps>("/api/partners", {
    name: randomName(),
    email: randomPartnerEmail(),
    ...overrides,
  });
}

async function cleanupRoundingFixture({
  partnerId,
  rewardId,
  customerId,
  commissionId,
}: {
  partnerId?: string;
  rewardId?: string;
  customerId?: string;
  commissionId?: string;
}) {
  if (commissionId) {
    await prisma.commission.deleteMany({ where: { id: commissionId } });
  }

  if (customerId) {
    await prisma.customer.deleteMany({ where: { id: customerId } });
  }

  if (partnerId) {
    await prisma.link.deleteMany({ where: { partnerId } });
    await prisma.programEnrollment.deleteMany({ where: { partnerId } });
    await conn.execute(`DELETE FROM Partner WHERE id = ?`, [partnerId]);
  }

  if (rewardId) {
    await prisma.reward.deleteMany({ where: { id: rewardId } });
  }
}

test("PATCH /commissions/:id – 3¢ sale at 20% rounds to 1¢", async ({
  api,
  workspace,
  program,
}) => {
  let partnerId: string | undefined;
  let rewardId: string | undefined;
  let customerId: string | undefined;
  let commissionId: string | undefined;

  try {
    const { status: partnerStatus, data: partner } = await createPartner(api);
    expect(partnerStatus).toEqual(201);
    partnerId = partner.id;

    const reward = await prisma.reward.create({
      data: {
        id: createId({ prefix: "rw_" }),
        programId: program.id,
        event: "sale",
        type: "percentage",
        amountInPercentage: new Prisma.Decimal(20),
      },
    });
    rewardId = reward.id;

    await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId,
          programId: program.id,
        },
      },
      data: {
        saleRewardId: reward.id,
      },
    });

    const customer = randomCustomer();
    customerId = createId({ prefix: "cus_" });

    await prisma.customer.create({
      data: {
        id: customerId,
        name: customer.name,
        email: customer.email,
        externalId: customer.externalId,
        country: customer.country,
        projectId: workspace.id,
        programId: program.id,
        partnerId,
      },
    });

    commissionId = createId({ prefix: "cm_" });

    await prisma.commission.create({
      data: {
        id: commissionId,
        programId: program.id,
        partnerId,
        customerId,
        rewardId,
        type: "sale",
        amount: 100,
        earnings: 20,
        quantity: 1,
        currency: "usd",
        status: "pending",
      },
    });

    const { status, data } = await api.patch<CommissionResponse>(
      `/api/commissions/${commissionId}`,
      { saleAmount: 3 },
    );

    expect(status).toEqual(200);
    expect(data.amount).toEqual(3);
    expect(data.earnings).toEqual(1);
    expect(data.status).toEqual("pending");
  } finally {
    await cleanupRoundingFixture({
      partnerId,
      rewardId,
      customerId,
      commissionId,
    });
  }
});
