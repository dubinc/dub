import { prisma } from "@/lib/prisma";
import type { CommissionResponse } from "@/lib/types";
import { expect } from "@playwright/test";
import type { ApiClient } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";
import { TEST_COMMISSION_REWARDS } from "../setup-test-workspace";

export async function withCommissionPartner(
  api: ApiClient,
  program: { defaultGroupId: string },
  run: (partnerId: string) => Promise<void>,
) {
  let partnerId: string | undefined;

  try {
    const { status, data } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = data.id;
    expect(status).toEqual(201);
    await run(partnerId);
  } finally {
    await deleteCommissionPartner({ partnerId });
  }
}

export async function deleteCommissionPartner({
  partnerId,
}: {
  partnerId: string | undefined;
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
}

export async function expectCommissionCreated({
  api,
  partnerId,
  programId,
  type,
  description,
  invoiceId,
  expectedAmount,
  expectedEarnings,
  expectedCreatedAt,
  expectedMetadata,
}: {
  api: ApiClient;
  partnerId: string;
  programId: string;
  type: "custom" | "lead" | "sale";
  description?: string;
  invoiceId?: string;
  expectedAmount?: number;
  expectedEarnings?: number;
  expectedCreatedAt?: Date;
  expectedMetadata?: Record<string, unknown> | null;
}): Promise<string> {
  const amount =
    expectedAmount ?? (type === "lead" ? 0 : type === "sale" ? 1000 : 0);
  const earnings =
    expectedEarnings ??
    (type === "lead"
      ? TEST_COMMISSION_REWARDS.lead.amountInCents
      : type === "sale"
        ? TEST_COMMISSION_REWARDS.sale.amountInCents
        : 0);
  const metadata =
    expectedMetadata === undefined ? null : expectedMetadata;

  let commissionId: string | undefined;

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

      commissionId = commission.id;

      return {
        partnerId: commission.partnerId,
        programId: commission.programId,
        type: commission.type,
        amount: Number(commission.amount),
        earnings: Number(commission.earnings),
        quantity: commission.quantity,
        description: commission.description,
        invoiceId: commission.invoiceId,
        currency: commission.currency,
        createdAt: commission.createdAt.toISOString(),
        metadata: commission.metadata,
      };
    })
    .toEqual({
      partnerId,
      programId,
      type,
      amount,
      earnings,
      quantity: 1,
      description: description ?? null,
      invoiceId: invoiceId ?? null,
      currency: "usd",
      createdAt: expectedCreatedAt
        ? expectedCreatedAt.toISOString()
        : expect.any(String),
      metadata,
    });

  if (!commissionId) {
    throw new Error("Commission was not created");
  }

  const listQuery = new URLSearchParams({
    partnerId,
    type,
    ...(invoiceId ? { invoiceId } : {}),
  });

  const { status: listStatus, data: commissions } = await api.get<
    CommissionResponse[]
  >(`/api/commissions?${listQuery}`);

  expect(listStatus).toEqual(200);

  const listed = invoiceId
    ? commissions.find((c) => c.invoiceId === invoiceId)
    : description
      ? commissions.find((c) => c.description === description)
      : commissions.find((c) => c.id === commissionId);

  expect(listed).toMatchObject({
    id: commissionId,
    type,
    metadata,
  });

  const { status: detailStatus, data: detail } =
    await api.get<CommissionResponse>(`/api/commissions/${commissionId}`);

  expect(detailStatus).toEqual(200);
  expect(detail).toMatchObject({
    id: commissionId,
    type,
    metadata,
  });

  return commissionId;
}
