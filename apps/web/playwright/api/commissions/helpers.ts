import { prisma } from "@/lib/prisma";
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
  partnerId: string;
  programId: string;
  type: "custom" | "lead" | "sale";
  description?: string;
  invoiceId?: string;
  expectedAmount?: number;
  expectedEarnings?: number;
  expectedCreatedAt?: Date;
  expectedMetadata?: Record<string, unknown> | null;
}) {
  const amount =
    expectedAmount ?? (type === "lead" ? 0 : type === "sale" ? 1000 : 0);
  const earnings =
    expectedEarnings ??
    (type === "lead"
      ? TEST_COMMISSION_REWARDS.lead.amountInCents
      : type === "sale"
        ? TEST_COMMISSION_REWARDS.sale.amountInCents
        : 0);

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
      metadata: expectedMetadata === undefined ? null : expectedMetadata,
    });
}
