import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError } from "../../utils";
import { test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";

const expectedQueuedResponse = {
  success: true,
  message: "A clawback has been queued for the partner!",
};

async function expectClawbackCreated({
  partnerId,
  programId,
  amount,
  description,
}: {
  partnerId: string;
  programId: string;
  amount: number;
  description: string;
}) {
  await expect
    .poll(async () => {
      const commission = await prisma.commission.findFirst({
        where: {
          partnerId,
          programId,
          type: "custom",
          description,
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
      description,
    });
}

test("POST /commissions – clawback with arbitrary description", async ({
  api,
  program,
}) => {
  let partnerId: string | undefined;
  const description = `chargeback-${nanoid()}`;

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    const { status, data } = await api.post("/api/commissions", {
      type: "custom",
      partnerId,
      amount: -100,
      description,
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectClawbackCreated({
      partnerId: created.id,
      programId: program.id,
      amount: 100,
      description,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

const missingPartnerId = `pn_${nanoid()}`;

const clawbackErrorCases = [
  {
    name: "POST /commissions – clawback partner not found",
    body: {
      type: "custom",
      partnerId: missingPartnerId,
      amount: -500,
      description: "fraud",
    },
    expected: ({ program }: { program: { id: string } }) =>
      apiError({
        code: "not_found",
        message: `Partner ${missingPartnerId} is not enrolled in program ${program.id}.`,
      }),
  },
  {
    name: "POST /commissions – clawback missing partnerId",
    body: { type: "custom", amount: -500, description: "fraud" },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "invalid_type: partnerId: Invalid input: expected string, received undefined",
    }),
  },
];

for (const { name, body, expected } of clawbackErrorCases) {
  test(name, async ({ api, program }) => {
    expect(await api.post("/api/commissions", body)).toEqual(
      typeof expected === "function" ? expected({ program }) : expected,
    );
  });
}
