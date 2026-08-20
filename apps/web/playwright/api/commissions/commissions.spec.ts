import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError, randomCustomer } from "../../utils";
import { test } from "../fixtures";
import { createPartner, deletePartner } from "../partners/helpers";
import {
  createPartnerWithCommissionRewards,
  deleteCommissionPartner,
  expectCommissionCreated,
  LEAD_REWARD_CENTS,
  SALE_REWARD_CENTS,
} from "./helpers";

const expectedQueuedResponse = {
  success: true,
  message: "Your commissions are being created and will appear shortly.",
};

const oversizedMetadata = {
  blob: "x".repeat(10_000),
};

test("POST /commissions – custom", async ({ api, program }) => {
  let partnerId: string | undefined;
  const description = `custom-${nanoid()}`;

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    const { status, data } = await api.post("/api/commissions", {
      type: "custom",
      partnerId,
      amount: 500,
      description,
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectCommissionCreated({
      partnerId: created.id,
      programId: program.id,
      type: "custom",
      description,
      expectedAmount: 0,
      expectedEarnings: 500,
    });
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /commissions – lead", async ({ api, program }) => {
  let partnerId: string | undefined;
  let groupId: string | undefined;
  const customer = randomCustomer();

  try {
    const created = await createPartnerWithCommissionRewards(api, {
      programId: program.id,
    });
    partnerId = created.data.id;
    groupId = created.groupId;
    expect(created.status).toEqual(201);

    const { status, data } = await api.post("/api/commissions", {
      type: "lead",
      partnerId,
      customer: {
        externalId: customer.externalId,
        email: customer.email,
        name: customer.name,
        country: "US",
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectCommissionCreated({
      partnerId: created.data.id,
      programId: program.id,
      type: "lead",
      expectedAmount: 0,
      expectedEarnings: LEAD_REWARD_CENTS,
    });
  } finally {
    await deleteCommissionPartner({ partnerId, groupId });
  }
});

test("POST /commissions – sale", async ({ api, program }) => {
  let partnerId: string | undefined;
  let groupId: string | undefined;
  const invoiceId = `INV_${nanoid()}`;
  const customer = randomCustomer();

  try {
    const created = await createPartnerWithCommissionRewards(api, {
      programId: program.id,
    });
    partnerId = created.data.id;
    groupId = created.groupId;
    expect(created.status).toEqual(201);

    const { status, data } = await api.post("/api/commissions", {
      type: "sale",
      partnerId,
      saleAmount: 1000,
      invoiceId,
      customer: {
        externalId: customer.externalId,
        email: customer.email,
        name: customer.name,
        country: "US",
      },
    });

    expect(status).toEqual(202);
    expect(data).toStrictEqual(expectedQueuedResponse);

    await expectCommissionCreated({
      partnerId: created.data.id,
      programId: program.id,
      type: "sale",
      invoiceId,
      expectedAmount: 1000,
      expectedEarnings: SALE_REWARD_CENTS,
    });
  } finally {
    await deleteCommissionPartner({ partnerId, groupId });
  }
});

test("POST /commissions – customer not found", async ({ api, program }) => {
  let partnerId: string | undefined;

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    expect(
      await api.post("/api/commissions", {
        type: "sale",
        partnerId,
        customerId: "cus_nonexistent",
        saleAmount: 1000,
      }),
    ).toEqual(
      apiError({
        code: "not_found",
        message: "Customer cus_nonexistent not found.",
      }),
    );
  } finally {
    await deletePartner(partnerId);
  }
});

test("POST /commissions – duplicate invoiceId", async ({ api, program }) => {
  let partnerId: string | undefined;
  const invoiceId = `INV_${nanoid()}`;
  const customer = randomCustomer();

  try {
    const { status: createStatus, data: created } = await createPartner(api, {
      groupId: program.defaultGroupId,
    });
    partnerId = created.id;
    expect(createStatus).toEqual(201);

    await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        programId: program.id,
        partnerId: created.id,
        type: "sale",
        amount: 1000,
        earnings: 100,
        quantity: 1,
        invoiceId,
      },
    });

    expect(
      await api.post("/api/commissions", {
        type: "sale",
        partnerId,
        saleAmount: 1000,
        invoiceId,
        customer: {
          externalId: customer.externalId,
          email: customer.email,
          name: customer.name,
          country: "US",
        },
      }),
    ).toEqual(
      apiError({
        code: "conflict",
        message: `There is already a commission for the invoice ${invoiceId}.`,
      }),
    );
  } finally {
    await deleteCommissionPartner({ partnerId });
  }
});

const commissionErrorCases = [
  {
    name: "POST /commissions – missing type",
    body: { partnerId: "pn_test", amount: 500 },
    expected: apiError({
      code: "unprocessable_entity",
      message: "invalid_union: type: Invalid input",
    }),
  },
  {
    name: "POST /commissions – invalid type",
    body: { type: "invalid", partnerId: "pn_test" },
    expected: apiError({
      code: "unprocessable_entity",
      message: "invalid_union: type: Invalid input",
    }),
  },
  {
    name: "POST /commissions – custom amount 0",
    body: { type: "custom", partnerId: "pn_test", amount: 0 },
    expected: apiError({
      code: "unprocessable_entity",
      message: "custom: amount: Amount cannot be 0.",
    }),
  },
  {
    name: "POST /commissions – sale missing amount",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      importStripeInvoices: false,
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: sale.amount: `sale.amount` is required when `importStripeInvoices` is false.",
    }),
  },
  {
    name: "POST /commissions – saleAmount 0",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      importStripeInvoices: false,
      saleAmount: 0,
    },
    expected: apiError({
      code: "unprocessable_entity",
      message: "custom: saleAmount: Sale amount cannot be 0.",
    }),
  },
  {
    name: "POST /commissions – sale.amount 0",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      sale: { amount: 0 },
    },
    expected: apiError({
      code: "unprocessable_entity",
      message: "custom: sale.amount: Sale amount cannot be 0.",
    }),
  },
  {
    name: "POST /commissions – importStripeInvoices with sale",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      importStripeInvoices: true,
      sale: {},
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: sale: `sale`, `date`, `saleAmount`, `saleEventDate`, `invoiceId`, and `productId` cannot be provided when `importStripeInvoices` is enabled.",
    }),
  },
  {
    name: "POST /commissions – importStripeInvoices with date",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      importStripeInvoices: true,
      date: new Date().toISOString(),
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: date: `sale`, `date`, `saleAmount`, `saleEventDate`, `invoiceId`, and `productId` cannot be provided when `importStripeInvoices` is enabled.",
    }),
  },
  {
    name: "POST /commissions – invalid paymentProcessor",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      sale: { amount: 1000, paymentProcessor: "foo" },
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        'invalid_value: sale.paymentProcessor: Invalid option: expected one of "stripe"|"shopify"|"polar"|"paddle"|"apple"|"revenuecat"|"dub"|"custom"',
    }),
  },
  {
    name: "POST /commissions – sale metadata too large",
    body: {
      type: "sale",
      partnerId: "pn_test",
      customerId: "cus_test",
      sale: { amount: 1000, metadata: oversizedMetadata },
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: sale.metadata: Metadata must be less than 10,000 characters when stringified",
    }),
  },
  {
    name: "POST /commissions – lead metadata too large",
    body: {
      type: "lead",
      partnerId: "pn_test",
      customerId: "cus_test",
      lead: { metadata: oversizedMetadata },
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: lead.metadata: Metadata must be less than 10,000 characters when stringified",
    }),
  },
  {
    name: "POST /commissions – custom metadata too large",
    body: {
      type: "custom",
      partnerId: "pn_test",
      amount: 500,
      metadata: oversizedMetadata,
    },
    expected: apiError({
      code: "unprocessable_entity",
      message:
        "custom: metadata: Metadata must be less than 10,000 characters when stringified",
    }),
  },
];

for (const { name, body, expected } of commissionErrorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/commissions", body)).toEqual(expected);
  });
}
