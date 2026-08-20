import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

const expectedQueuedResponse = {
  success: true,
  message: "Your clawback is being created and will appear shortly.",
};

test("POST /clawbacks – by partnerId", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    const { status, data } = await api.post("/api/clawbacks", {
      partnerId,
      amount: 500,
      reason: "fraud",
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectClawbackCreated({
      partnerId: created.id,
      programId: program.id,
      amount: 500,
      reason: "fraud",
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /clawbacks – by tenantId", async ({ api, program }) => {
  let partnerId: string | undefined;
  const tenantId = nanoid();

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      tenantId,
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);
    expect(created.tenantId).toBe(tenantId);

    const { status, data } = await api.post("/api/clawbacks", {
      tenantId,
      amount: 250,
      reason: "order_canceled",
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectClawbackCreated({
      partnerId: created.id,
      programId: program.id,
      amount: 250,
      reason: "order_canceled",
    });
  } finally {
    await deletePartner(partnerId);
  }
});

const missingPartnerId = `pn_${nanoid()}`;
const missingTenantId = nanoid();

const clawbackErrorCases = [
  {
    name: "POST /clawbacks – partner not found",
    body: { partnerId: missingPartnerId, amount: 500, reason: "fraud" },
    expected: ({ program }: { program: { id: string } }) =>
      apiError({
        code: "not_found",
        message: `Partner ${missingPartnerId} is not enrolled in program ${program.id}.`,
      }),
  },
  {
    name: "POST /clawbacks – tenantId not found",
    body: { tenantId: missingTenantId, amount: 500, reason: "fraud" },
    expected: apiError({
      code: "not_found",
      message: `Partner with specified tenantId ${missingTenantId} not found.`,
    }),
  },
  {
    name: "POST /clawbacks – missing partnerId and tenantId",
    body: { amount: 500, reason: "fraud" },
    expected: apiError({
      code: "bad_request",
      message: "Either `partnerId` or `tenantId` must be provided.",
    }),
  },
  {
    name: "POST /clawbacks – amount 0",
    body: { partnerId: "pn_test", amount: 0, reason: "fraud" },
    expected: apiError({
      code: "unprocessable_entity",
      message: "too_small: amount: Amount must be greater than 0.",
    }),
  },
  {
    name: "POST /clawbacks – amount negative",
    body: { partnerId: "pn_test", amount: -100, reason: "fraud" },
    expected: apiError({
      code: "unprocessable_entity",
      message: "too_small: amount: Amount must be greater than 0.",
    }),
  },
  {
    name: "POST /clawbacks – missing reason",
    body: { partnerId: "pn_test", amount: 500 },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        'invalid_value: reason: Invalid option: expected one of "order_canceled"|"fraud"|"terms_violation"|"tracking_error"|"payment_failed"|"ineligible_partner"|"duplicate_commission"|"other"',
    }),
  },
  {
    name: "POST /clawbacks – invalid reason",
    body: { partnerId: "pn_test", amount: 500, reason: "not_a_reason" },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        'invalid_value: reason: Invalid option: expected one of "order_canceled"|"fraud"|"terms_violation"|"tracking_error"|"payment_failed"|"ineligible_partner"|"duplicate_commission"|"other"',
    }),
  },
];

for (const { name, body, expected } of clawbackErrorCases) {
  test(name, async ({ api, program }) => {
    expect(await api.post("/api/clawbacks", body)).toEqual(
      typeof expected === "function" ? expected({ program }) : expected,
    );
  });
}

async function expectClawbackCreated({
  partnerId,
  programId,
  amount,
  reason,
}: {
  partnerId: string;
  programId: string;
  amount: number;
  reason: string;
}) {
  await expect
    .poll(async () => {
      const commission = await prisma.commission.findFirst({
        where: {
          partnerId,
          programId,
          type: "custom",
          description: reason,
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
      };
    })
    .toEqual({
      partnerId,
      programId,
      type: "custom",
      amount: 0,
      earnings: -amount,
      quantity: 1,
      description: reason,
    });
}
