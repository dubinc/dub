import { prisma } from "@/lib/prisma";
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { trackClick, trackLead } from "../conversions/helpers";
import { test } from "../fixtures";
import {
  postShopifyOrdersPaidWebhook,
  postShopifyPixel,
  waitForShopifyCheckoutClickId,
  waitForShopifyCustomerSale,
  waitForShopifySaleCommission,
  waitForShopifySaleEvent,
  withShopifyPartner,
} from "./helpers";

test.describe("Shopify orders/paid attribution", () => {
  test.describe.configure({ timeout: 90_000 });

  test("existing customer – records sale event and commission", async ({
    api,
    workspace,
    program,
  }) => {
    await withShopifyPartner(
      {
        workspaceId: workspace.id,
        programId: program.id,
        groupId: program.defaultGroupId,
      },
      async (seeded) => {
        const { clickId } = await trackClick({
          domain: seeded.domain,
          key: seeded.key,
        });

        const externalId = randomName("pw_cus", 16);
        await trackLead({
          clickId,
          customerExternalId: externalId,
        });

        const checkoutToken = randomName("pw_checkout", 24);
        const { status, data } = await postShopifyOrdersPaidWebhook({
          checkoutToken,
          customer: {
            id: externalId,
            first_name: "Playwright",
            last_name: "Shopify",
            email: `pw.shopify.${externalId}@dub-internal-test.com`,
          },
        });

        expect(status).toEqual(200);
        expect(data).toMatch(/Existing customer .+ found\. Order queued/);

        const customer = await waitForShopifyCustomerSale({
          workspaceId: workspace.id,
          externalId,
        });

        await waitForShopifySaleEvent({ api, customerId: customer.id });
        await waitForShopifySaleCommission({
          partnerId: seeded.partnerId,
          customerId: customer.id,
        });
      },
    );
  });

  test("partner discount code – records sale event and commission", async ({
    api,
    workspace,
    program,
  }) => {
    await withShopifyPartner(
      {
        workspaceId: workspace.id,
        programId: program.id,
        groupId: program.defaultGroupId,
        withDiscountCode: true,
      },
      async (seeded) => {
        const externalId = randomName("pw_cus", 16);
        const checkoutToken = randomName("pw_checkout", 24);
        const { status, data } = await postShopifyOrdersPaidWebhook({
          checkoutToken,
          customer: {
            id: externalId,
            first_name: "Playwright",
            last_name: "Shopify",
            email: `pw.shopify.${externalId}@dub-internal-test.com`,
          },
          discount_codes: [{ code: seeded.code }],
        });

        expect(status).toEqual(200);
        expect(data).toEqual(
          `[Shopify] Partner discount code ${seeded.code} found. Order queued for processing.`,
        );

        const customer = await waitForShopifyCustomerSale({
          workspaceId: workspace.id,
          externalId,
        });

        await waitForShopifySaleEvent({ api, customerId: customer.id });
        await waitForShopifySaleCommission({
          partnerId: seeded.partnerId,
          customerId: customer.id,
        });
      },
    );
  });

  test("new customer – webhook waits for pixel", async () => {
    const checkoutToken = randomName("pw_checkout", 24);
    const { status, data } = await postShopifyOrdersPaidWebhook({
      checkoutToken,
    });

    expect(status).toEqual(200);
    expect(data).toEqual("[Shopify] Waiting for pixel event to arrive...");
  });

  test("pixel first, then webhook – records sale event and commission", async ({
    api,
    workspace,
    program,
  }) => {
    await withShopifyPartner(
      {
        workspaceId: workspace.id,
        programId: program.id,
        groupId: program.defaultGroupId,
      },
      async (seeded) => {
        const { clickId } = await trackClick({
          domain: seeded.domain,
          key: seeded.key,
        });

        const checkoutToken = randomName("pw_checkout", 24);
        const externalId = randomName("pw_cus", 16);

        const pixel = await postShopifyPixel({ clickId, checkoutToken });
        expect(pixel).toEqual({ status: 200, data: "OK" });

        await waitForShopifyCheckoutClickId({ checkoutToken, clickId });

        const { status, data } = await postShopifyOrdersPaidWebhook({
          checkoutToken,
          customer: {
            id: externalId,
            first_name: "Playwright",
            last_name: "Shopify",
            email: `pw.shopify.${externalId}@dub-internal-test.com`,
          },
        });

        expect(status).toEqual(200);
        expect(data).toEqual(
          `[Shopify] Click ID ${clickId} found. Order queued for processing.`,
        );

        const customer = await waitForShopifyCustomerSale({
          workspaceId: workspace.id,
          externalId,
        });

        await waitForShopifySaleEvent({ api, customerId: customer.id });
        await waitForShopifySaleCommission({
          partnerId: seeded.partnerId,
          customerId: customer.id,
        });
      },
    );
  });

  test("webhook first, then pixel – records sale event and commission", async ({
    api,
    workspace,
    program,
  }) => {
    await withShopifyPartner(
      {
        workspaceId: workspace.id,
        programId: program.id,
        groupId: program.defaultGroupId,
      },
      async (seeded) => {
        const { clickId } = await trackClick({
          domain: seeded.domain,
          key: seeded.key,
        });

        const checkoutToken = randomName("pw_checkout", 24);
        const externalId = randomName("pw_cus", 16);

        const webhook = await postShopifyOrdersPaidWebhook({
          checkoutToken,
          customer: {
            id: externalId,
            first_name: "Playwright",
            last_name: "Shopify",
            email: `pw.shopify.${externalId}@dub-internal-test.com`,
          },
        });
        expect(webhook.status).toEqual(200);
        expect(webhook.data).toEqual(
          "[Shopify] Waiting for pixel event to arrive...",
        );

        const pixel = await postShopifyPixel({ clickId, checkoutToken });
        expect(pixel).toEqual({ status: 200, data: "OK" });

        const customer = await waitForShopifyCustomerSale({
          workspaceId: workspace.id,
          externalId,
        });

        await waitForShopifySaleEvent({ api, customerId: customer.id });
        await waitForShopifySaleCommission({
          partnerId: seeded.partnerId,
          customerId: customer.id,
        });
      },
    );
  });

  test("pixel and webhook arrive at the same time – records one sale and commission", async ({
    api,
    workspace,
    program,
  }) => {
    await withShopifyPartner(
      {
        workspaceId: workspace.id,
        programId: program.id,
        groupId: program.defaultGroupId,
      },
      async (seeded) => {
        const { clickId } = await trackClick({
          domain: seeded.domain,
          key: seeded.key,
        });

        const checkoutToken = randomName("pw_checkout", 24);
        const externalId = randomName("pw_cus", 16);
        const customer = {
          id: externalId,
          first_name: "Playwright",
          last_name: "Shopify",
          email: `pw.shopify.${externalId}@dub-internal-test.com`,
        };

        const [pixel, webhook] = await Promise.all([
          postShopifyPixel({ clickId, checkoutToken }),
          postShopifyOrdersPaidWebhook({ checkoutToken, customer }),
        ]);

        expect(pixel).toEqual({ status: 200, data: "OK" });
        expect(webhook.status).toEqual(200);
        expect([
          `[Shopify] Click ID ${clickId} found. Order queued for processing.`,
          "[Shopify] Waiting for pixel event to arrive...",
        ]).toContain(webhook.data);

        const createdCustomer = await waitForShopifyCustomerSale({
          workspaceId: workspace.id,
          externalId,
        });

        await waitForShopifySaleEvent({ api, customerId: createdCustomer.id });
        await waitForShopifySaleCommission({
          partnerId: seeded.partnerId,
          customerId: createdCustomer.id,
        });

        // Rendezvous claim + sale idempotency: exactly one sale for this checkout.
        expect(createdCustomer.sales).toEqual(1);
        const commissions = await prisma.commission.count({
          where: {
            partnerId: seeded.partnerId,
            customerId: createdCustomer.id,
            type: "sale",
          },
        });
        expect(commissions).toEqual(1);
      },
    );
  });
});
