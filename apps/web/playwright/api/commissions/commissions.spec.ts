import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { apiError, randomCustomer } from "../../utils";
import { test } from "../fixtures";
import { TEST_COMMISSION_REWARDS } from "../setup-test-workspace";
import { expectCommissionCreated, withCommissionPartner } from "./helpers";

const expectedQueuedResponse = {
  status: 202,
  data: {
    success: true,
    message: "Your commissions are being created and will appear shortly.",
  },
};

const expectedClawbackResponse = {
  status: 202,
  data: {
    success: true,
    message: "A clawback has been queued for the partner!",
  },
};

const oversizedMetadata = {
  blob: "x".repeat(10_000),
};

function customerBody() {
  const customer = randomCustomer();

  return {
    externalId: customer.externalId,
    email: customer.email,
    name: customer.name,
    country: "US",
  };
}

test.describe("Custom commissions", () => {
  test("creates a custom commission", async ({ api, program }) => {
    const description = `custom-${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "custom",
          partnerId,
          amount: 500,
          description,
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "custom",
        description,
        expectedAmount: 0,
        expectedEarnings: 500,
      });
    });
  });

  test("creates a clawback", async ({ api, program }) => {
    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "custom",
          partnerId,
          amount: -500,
          description: "fraud",
        }),
      ).toEqual(expectedClawbackResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "custom",
        description: "fraud",
        expectedAmount: 0,
        expectedEarnings: -500,
      });
    });
  });

  test.describe("validates", () => {
    const errorCases = [
      {
        name: "rejects amount of 0",
        body: { type: "custom", partnerId: "pn_test", amount: 0 },
        expected: apiError({
          code: "unprocessable_entity",
          message: "custom: amount: Amount cannot be 0.",
        }),
      },
      {
        name: "rejects clawback without description",
        body: { type: "custom", partnerId: "pn_test", amount: -500 },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: description: `description` is required when creating a clawback (negative amount).",
        }),
      },
    ];

    for (const { name, body, expected } of errorCases) {
      test(name, async ({ api }) => {
        expect(await api.post("/api/commissions", body)).toEqual(expected);
      });
    }
  });
});

test.describe("Lead commissions", () => {
  test("creates a lead commission", async ({ api, program }) => {
    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "lead",
      });
    });
  });

  test("creates using date + lead.eventName", async ({ api, program }) => {
    const date = new Date("2024-01-10T00:00:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          date: date.toISOString(),
          lead: {
            eventName: "Requested demo",
            metadata: { plan: "pro" },
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "lead",
        expectedEarnings:
          TEST_COMMISSION_REWARDS.lead.modifiers[0].amountInCents,
        expectedCreatedAt: date,
      });
    });
  });

  test("supports deprecated leadEventName + leadEventDate", async ({
    api,
    program,
  }) => {
    const leadEventDate = new Date("2024-06-15T12:00:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          leadEventName: "Signed up",
          leadEventDate: leadEventDate.toISOString(),
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "lead",
        expectedCreatedAt: leadEventDate,
      });
    });
  });

  test("date takes precedence over leadEventDate", async ({ api, program }) => {
    const date = new Date("2024-08-01T00:00:00.000Z");
    const leadEventDate = new Date("2020-01-01T00:00:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          date: date.toISOString(),
          leadEventDate: leadEventDate.toISOString(),
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "lead",
        expectedCreatedAt: date,
      });
    });
  });

  test.describe("validates", () => {
    test("rejects oversized metadata", async ({ api }) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId: "pn_test",
          customerId: "cus_test",
          lead: { metadata: oversizedMetadata },
        }),
      ).toEqual(
        apiError({
          code: "unprocessable_entity",
          message:
            "custom: lead.metadata: Metadata must be less than 10,000 characters when stringified",
        }),
      );
    });
  });
});

test.describe("Sale commissions", () => {
  test("creates a sale commission", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 1000,
          invoiceId,
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
      });
    });
  });

  test("creates using nested sale", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 1000,
          invoiceId,
          sale: {
            amount: 1000,
            currency: "usd",
            eventName: "Invoice paid",
            paymentProcessor: "stripe",
            invoiceId,
            metadata: { productId: "sku_nested" },
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
      });
    });
  });

  test("supports deprecated sale fields", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;
    const saleEventDate = new Date("2024-03-01T08:30:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 1000,
          invoiceId,
          productId: "sku_deprecated",
          saleEventDate: saleEventDate.toISOString(),
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedCreatedAt: saleEventDate,
      });
    });
  });

  test("rejects duplicate invoice", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      await prisma.commission.create({
        data: {
          id: createId({ prefix: "cm_" }),
          programId: program.id,
          partnerId,
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
          customer: customerBody(),
        }),
      ).toEqual(
        apiError({
          code: "conflict",
          message: `There is already a commission for the invoice ${invoiceId}.`,
        }),
      );
    });
  });

  test("imports Stripe invoices", async ({ api, program, workspace }) => {
    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          importStripeInvoices: true,
          customer: customerBody(),
        }),
      ).toEqual(
        apiError({
          code: "bad_request",
          message: `Your workspace isn't connected to Stripe yet. Please install the Stripe integration to continue: https://app.dub.co/${workspace.slug}/settings/integrations/stripe`,
        }),
      );
    });
  });

  test.describe("validates", () => {
    const errorCases = [
      {
        name: "rejects missing saleAmount",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          importStripeInvoices: false,
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: saleAmount: `saleAmount` is required when `importStripeInvoices` is false.",
        }),
      },
      {
        name: "rejects saleAmount of 0",
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
        name: "rejects missing sale.amount",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          saleAmount: 1000,
          sale: {},
        },
        expected: apiError({
          code: "unprocessable_entity",
          message: "invalid_type: sale.amount: amount is required",
        }),
      },
      {
        name: "rejects invalid paymentProcessor",
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
        name: "rejects oversized metadata",
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
        name: "rejects sale.amount without saleAmount",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          sale: { amount: 1000 },
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: saleAmount: `saleAmount` is required when `importStripeInvoices` is false.",
        }),
      },
    ];

    for (const { name, body, expected } of errorCases) {
      test(name, async ({ api }) => {
        expect(await api.post("/api/commissions", body)).toEqual(expected);
      });
    }

    test("rejects unknown customer", async ({ api, program }) => {
      await withCommissionPartner(api, program, async (partnerId) => {
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
      });
    });
  });
});

const typeErrorCases = [
  {
    name: "rejects missing type",
    body: { partnerId: "pn_test", amount: 500 },
  },
  {
    name: "rejects invalid type",
    body: { type: "invalid", partnerId: "pn_test" },
  },
];

for (const { name, body } of typeErrorCases) {
  test(name, async ({ api }) => {
    expect(await api.post("/api/commissions", body)).toEqual(
      apiError({
        code: "unprocessable_entity",
        message: "invalid_union: type: Invalid input",
      }),
    );
  });
}
