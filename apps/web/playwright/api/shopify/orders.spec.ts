import { nanoid } from "@dub/utils";
import { expect } from "@playwright/test";
import { randomName } from "../../utils";
import { trackClick, trackLead } from "../conversions/helpers";
import { test } from "../fixtures";
import { TEST_WORKSPACE } from "../setup-test-workspace";
import {
  getCustomerByExternalId,
  postShopifyOrdersPaidWebhook,
  postShopifyPixel,
} from "./helpers";

test("POST /shopify/pixel – skips when checkoutToken is missing", async () => {
  const pixel = await postShopifyPixel({ clickId: nanoid(16) });

  expect(pixel).toEqual({ status: 200, data: "OK" });
});

test("POST /shopify/integration/webhook – unknown shop", async () => {
  const { status, data } = await postShopifyOrdersPaidWebhook({
    checkoutToken: nanoid(10),
    storeId: `${randomName("pw-shopify")}.myshopify.com`,
  });

  expect(status).toEqual(200);
  expect(data).toMatch(/Workspace not found for shop: .+\. Skipping\.\.\./);
});

test("orders/paid – waits for pixel when there is no click or customer", async () => {
  const { status, data } = await postShopifyOrdersPaidWebhook({
    checkoutToken: nanoid(10),
  });

  expect(status).toEqual(200);
  expect(data).toEqual("[Shopify] Waiting for pixel event to arrive...");
});

test.describe("Shopify orders/paid", () => {
  test.describe.configure({ mode: "serial" });

  let linkId: string | undefined;
  let clickId: string;

  test.beforeAll(async ({ api }) => {
    const { data: link } = await api.post<{
      id: string;
      domain: string;
      key: string;
    }>("/api/links", {
      url: `https://example.com/${nanoid()}`,
      domain: TEST_WORKSPACE.domain,
      key: nanoid(12),
      trackConversion: true,
    });
    linkId = link.id;

    ({ clickId } = await trackClick({
      domain: link.domain,
      key: link.key,
    }));
  });

  test.afterAll(async ({ api }) => {
    if (linkId) {
      await api.delete(`/api/links/${linkId}`);
    }
  });

  test("click first, then webhook", async () => {
    const checkoutToken = nanoid(10);

    const pixel = await postShopifyPixel({ clickId, checkoutToken });
    expect(pixel).toEqual({ status: 200, data: "OK" });

    const webhook = await postShopifyOrdersPaidWebhook({ checkoutToken });
    expect(webhook.status).toEqual(200);
    expect(webhook.data).toEqual(
      `[Shopify] Click ID ${clickId} found. Order queued for processing.`,
    );
  });

  test("webhook first, then click", async () => {
    const checkoutToken = nanoid(10);

    const webhook = await postShopifyOrdersPaidWebhook({ checkoutToken });
    expect(webhook.status).toEqual(200);
    expect(webhook.data).toEqual(
      "[Shopify] Waiting for pixel event to arrive...",
    );

    const pixel = await postShopifyPixel({ clickId, checkoutToken });
    expect(pixel).toEqual({ status: 200, data: "OK" });
  });

  test("click and webhook in parallel", async () => {
    const checkoutToken = nanoid(10);

    const [pixel, webhook] = await Promise.all([
      postShopifyPixel({ clickId, checkoutToken }),
      postShopifyOrdersPaidWebhook({ checkoutToken }),
    ]);

    expect(pixel).toEqual({ status: 200, data: "OK" });
    expect(webhook.status).toEqual(200);
    expect([
      `[Shopify] Click ID ${clickId} found. Order queued for processing.`,
      "[Shopify] Waiting for pixel event to arrive...",
    ]).toContain(webhook.data);
  });

  test("webhook with dubClickId in note_attributes", async () => {
    const checkoutToken = nanoid(10);

    const webhook = await postShopifyOrdersPaidWebhook({
      checkoutToken,
      note_attributes: [{ name: "dubClickId", value: clickId }],
    });

    expect(webhook.status).toEqual(200);
    expect(webhook.data).toEqual(
      `[Shopify] Click ID ${clickId} found. Order queued for processing.`,
    );
  });

  test("webhook with unknown dubClickId skips the order", async () => {
    const checkoutToken = nanoid(10);

    const webhook = await postShopifyOrdersPaidWebhook({
      checkoutToken,
      note_attributes: [{ name: "dubClickId", value: nanoid(16) }],
    });

    expect(webhook.status).toEqual(200);
    expect(webhook.data).toEqual(
      "[Shopify] Click event not found. Skipping the order...",
    );
  });

  test("orders/paid – existing customer", async ({ api }) => {
    const { customer } = await trackLead({ clickId });
    const created = await getCustomerByExternalId(api, customer.externalId);
    expect(created?.id).toEqual(expect.any(String));

    const { status, data } = await postShopifyOrdersPaidWebhook({
      checkoutToken: nanoid(10),
      existingCustomerId: customer.externalId,
    });

    expect(status).toEqual(200);
    expect(data).toEqual(
      `[Shopify] Existing customer ${created!.id} found. Order queued for processing.`,
    );
  });
});
