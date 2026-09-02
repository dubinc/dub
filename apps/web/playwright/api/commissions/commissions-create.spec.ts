import { createId } from "@/lib/api/create-id";
import { prisma } from "@/lib/prisma";
import type { CommissionResponse } from "@/lib/types";
import { redis } from "@/lib/upstash";
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

async function seedDiscountCode({
  programId,
  partnerId,
  disabledAt,
}: {
  programId: string;
  partnerId: string;
  disabledAt?: Date;
}) {
  const link = await prisma.link.findFirst({
    where: { partnerId },
    orderBy: { createdAt: "asc" },
  });

  if (!link) {
    throw new Error("Partner was created without a default link.");
  }

  const code = `PW${nanoid(8)}`;

  await prisma.discountCode.create({
    data: {
      id: createId({ prefix: "dcode_" }),
      code,
      programId,
      partnerId,
      linkId: link.id,
      disabledAt,
    },
  });

  return { code, linkId: link.id };
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
        api,
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
        api,
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
        api,
        partnerId,
        programId: program.id,
        type: "lead",
        expectedMetadata: null,
      });
    });
  });

  test("creates using date, eventName, and metadata", async ({
    api,
    program,
  }) => {
    const date = new Date("2024-01-10T00:00:00.000Z");
    const metadata = { plan: "pro" };

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          date: date.toISOString(),
          lead: {
            eventName: "Requested demo",
            metadata,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "lead",
        expectedEarnings:
          TEST_COMMISSION_REWARDS.lead.modifiers[0].amountInCents,
        expectedCreatedAt: date,
        expectedMetadata: metadata,
      });
    });
  });

  test("treats empty lead metadata as absent", async ({ api, program }) => {
    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "lead",
          partnerId,
          lead: { metadata: {} },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "lead",
        expectedMetadata: null,
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
        api,
        partnerId,
        programId: program.id,
        type: "lead",
        expectedCreatedAt: leadEventDate,
        expectedMetadata: null,
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
        api,
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
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedMetadata: null,
      });
    });
  });

  test("creates using discountCode", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      const { code, linkId } = await seedDiscountCode({
        programId: program.id,
        partnerId,
      });

      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          discountCode: code,
          saleAmount: 1000,
          invoiceId,
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedLinkId: linkId,
        expectedMetadata: null,
      });
    });
  });

  test("creates using nested sale", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;
    const date = new Date("2024-02-20T00:00:00.000Z");
    const metadata = { plan: "pro" };

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          date: date.toISOString(),
          sale: {
            amount: 1000,
            currency: "usd",
            eventName: "Invoice paid",
            paymentProcessor: "stripe",
            invoiceId,
            metadata,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedCreatedAt: date,
        expectedEarnings:
          TEST_COMMISSION_REWARDS.sale.modifiers[1].amountInCents,
        expectedMetadata: metadata,
      });
    });
  });

  test("PATCH preserves metadata on the response", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;
    // Avoid plan/productId keys that trigger sale reward modifiers.
    const metadata = { campaign: "spring" };

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          sale: {
            amount: 1000,
            invoiceId,
            metadata,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      const commissionId = await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedMetadata: metadata,
      });

      const { status, data } = await api.patch<CommissionResponse>(
        `/api/commissions/${commissionId}`,
        { earnings: 1111 },
      );

      expect(status).toEqual(200);
      expect(data).toMatchObject({
        id: commissionId,
        earnings: 1111,
        metadata,
      });
    });
  });

  test("creates using nested sale with string amount", async ({
    api,
    program,
  }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          sale: {
            amount: "1000",
            invoiceId,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
      });
    });
  });

  test("converts nested sale.currency to USD", async ({ api, program }) => {
    const invoiceId = `INV_${nanoid()}`;
    const eurRate = await redis.hget("fxRates:usd", "EUR");
    test.skip(!eurRate, "EUR FX rate not available in Redis");

    const expectedAmount = Math.round(10000 / Number(eurRate));

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          sale: {
            amount: 10000,
            currency: "eur",
            invoiceId,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedAmount,
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
          productId: "sku_pro",
          saleEventDate: saleEventDate.toISOString(),
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedCreatedAt: saleEventDate,
        expectedEarnings:
          TEST_COMMISSION_REWARDS.sale.modifiers[0].amountInCents,
        // Deprecated top-level productId must not leak into commission.metadata.
        expectedMetadata: null,
      });
    });
  });

  test("creates with saleAmount when nested sale has no amount", async ({
    api,
    program,
  }) => {
    const invoiceId = `INV_${nanoid()}`;

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 1000,
          sale: {
            eventName: "Invoice paid",
            invoiceId,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
      });
    });
  });

  test("date takes precedence over saleEventDate", async ({ api, program }) => {
    const date = new Date("2024-08-01T00:00:00.000Z");
    const saleEventDate = new Date("2020-01-01T00:00:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 1000,
          date: date.toISOString(),
          saleEventDate: saleEventDate.toISOString(),
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        expectedCreatedAt: date,
      });
    });
  });

  test("nested sale takes precedence over deprecated fields", async ({
    api,
    program,
  }) => {
    const invoiceId = `INV_${nanoid()}`;
    const date = new Date("2024-09-15T00:00:00.000Z");

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          saleAmount: 500,
          invoiceId: `INV_${nanoid()}`,
          productId: "sku_old",
          saleEventDate: new Date("2020-01-01T00:00:00.000Z").toISOString(),
          date: date.toISOString(),
          sale: {
            amount: 2000,
            invoiceId,
            metadata: { productId: "sku_pro" },
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        expectedAmount: 2000,
        expectedCreatedAt: date,
        expectedEarnings:
          TEST_COMMISSION_REWARDS.sale.modifiers[0].amountInCents,
        // User-provided sale.metadata persists; deprecated productId does not.
        expectedMetadata: { productId: "sku_pro" },
      });
    });
  });

  test("coerces non-string sale.metadata.productId in reward context", async ({
    api,
    program,
  }) => {
    const invoiceId = `INV_${nanoid()}`;
    const metadata = { productId: 12345 };

    await withCommissionPartner(api, program, async (partnerId) => {
      expect(
        await api.post("/api/commissions", {
          type: "sale",
          partnerId,
          sale: {
            amount: 1000,
            invoiceId,
            metadata,
          },
          customer: customerBody(),
        }),
      ).toEqual(expectedQueuedResponse);

      await expectCommissionCreated({
        api,
        partnerId,
        programId: program.id,
        type: "sale",
        invoiceId,
        // Non-string productId is dropped from reward context (no productId modifier).
        expectedEarnings: TEST_COMMISSION_REWARDS.sale.amountInCents,
        // Original metadata still persists on the commission.
        expectedMetadata: metadata,
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

  test("rejects duplicate nested sale.invoiceId", async ({ api, program }) => {
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
          sale: { amount: 1000, invoiceId },
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
        name: "rejects missing sale.amount and saleAmount",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          importStripeInvoices: false,
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: saleAmount: `sale.amount` or `saleAmount` is required when `importStripeInvoices` is false.",
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
        name: "rejects sale.amount of 0",
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
        name: "rejects non-integer sale.amount",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          sale: { amount: 10.5 },
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "invalid_type: sale.amount: Invalid input: expected int, received number",
        }),
      },
      {
        name: "rejects nested sale fields when importing Stripe invoices",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          importStripeInvoices: true,
          date: "2024-03-01T08:30:00.000Z",
          sale: {
            amount: 5000,
            invoiceId: "in_test",
            metadata: { productId: "sku" },
          },
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: sale: `sale`, `date`, `invoiceId`, `productId` cannot be provided when `importStripeInvoices` is enabled.",
        }),
      },
      {
        name: "rejects empty invoiceId and productId when importing Stripe invoices",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          importStripeInvoices: true,
          invoiceId: "",
          productId: "",
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: invoiceId: `invoiceId`, `productId` cannot be provided when `importStripeInvoices` is enabled.",
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
            'invalid_value: sale.paymentProcessor: Invalid option: expected one of "stripe"|"shopify"|"polar"|"paddle"|"apple"|"revenuecat"|"lemonsqueezy"|"dub"|"custom"',
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
        name: "rejects linkId and discountCode together",
        body: {
          type: "sale",
          partnerId: "pn_test",
          customerId: "cus_test",
          saleAmount: 1000,
          linkId: "link_test",
          discountCode: "SAVE10",
        },
        expected: apiError({
          code: "unprocessable_entity",
          message:
            "custom: discountCode: Either `linkId` or `discountCode` may be provided, not both.",
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

    test("rejects unknown discountCode", async ({ api, program }) => {
      await withCommissionPartner(api, program, async (partnerId) => {
        const code = `MISSING${nanoid(8)}`;

        expect(
          await api.post("/api/commissions", {
            type: "sale",
            partnerId,
            discountCode: code,
            saleAmount: 1000,
            customer: customerBody(),
          }),
        ).toEqual(
          apiError({
            code: "not_found",
            message: `Discount code ${code} not found.`,
          }),
        );
      });
    });

    test("rejects another partner's discountCode", async ({ api, program }) => {
      await withCommissionPartner(api, program, async (partnerId) => {
        await withCommissionPartner(api, program, async (otherPartnerId) => {
          const { code } = await seedDiscountCode({
            programId: program.id,
            partnerId: otherPartnerId,
          });

          const partner = await prisma.partner.findUniqueOrThrow({
            where: { id: partnerId },
            select: { id: true, email: true },
          });

          expect(
            await api.post("/api/commissions", {
              type: "sale",
              partnerId,
              discountCode: code,
              saleAmount: 1000,
              customer: customerBody(),
            }),
          ).toEqual(
            apiError({
              code: "not_found",
              message: `Discount code ${code} does not belong to partner ${partner.email} (${partner.id}).`,
            }),
          );
        });
      });
    });

    test("rejects disabled discountCode", async ({ api, program }) => {
      await withCommissionPartner(api, program, async (partnerId) => {
        const { code } = await seedDiscountCode({
          programId: program.id,
          partnerId,
          disabledAt: new Date(),
        });

        expect(
          await api.post("/api/commissions", {
            type: "sale",
            partnerId,
            discountCode: code,
            saleAmount: 1000,
            customer: customerBody(),
          }),
        ).toEqual(
          apiError({
            code: "bad_request",
            message: `Discount code ${code} is disabled.`,
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
