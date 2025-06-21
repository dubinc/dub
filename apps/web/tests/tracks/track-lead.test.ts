import { TrackLeadResponse, TrackSaleResponse } from "@/lib/types";
import { randomCustomer } from "tests/utils/helpers";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

// Helper function to verify lead tracking response
const expectValidLeadResponse = ({
  response,
  customer,
  clickId,
}: {
  response: { status: number; data: TrackLeadResponse };
  customer: any;
  clickId: string;
}) => {
  expect(response.status).toEqual(200);
  expect(response.data).toStrictEqual({
    clickId,
    customerName: customer.name,
    customerEmail: customer.email,
    customerAvatar: customer.avatar,
    click: {
      id: clickId,
    },
    customer,
  });
};

describe("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  const clickResponse = await http.post<{ clickId: string }>({
    path: "/track/click",
    headers: {
      referer: "https://dub.co",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    },
    body: {
      domain: "getacme.link",
      key: "derek",
    },
  });

  expect(clickResponse.status).toEqual(200);
  expect(clickResponse.data.clickId).toStrictEqual(expect.any(String));

  const trackedClickId = clickResponse.data.clickId;

  const customer1 = randomCustomer();

  test("track a lead", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: trackedClickId,
        eventName: "Signup",
        externalId: customer1.externalId,
        customerName: customer1.name,
        customerEmail: customer1.email,
        customerAvatar: customer1.avatar,
      },
    });

    expectValidLeadResponse({
      response,
      customer: customer1,
      clickId: trackedClickId,
    });
  });

  test("duplicate request with same externalId", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: trackedClickId,
        eventName: "Signup",
        externalId: customer1.externalId,
        customerName: customer1.name,
        customerEmail: customer1.email,
        customerAvatar: customer1.avatar,
      },
    });

    // should return the same response since it's idempotent
    expectValidLeadResponse({
      response,
      customer: customer1,
      clickId: trackedClickId,
    });
  });

  test("track a lead with eventQuantity", async () => {
    const customer2 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: trackedClickId,
        eventName: "Start Trial",
        externalId: customer2.externalId,
        customerName: customer2.name,
        customerEmail: customer2.email,
        customerAvatar: customer2.avatar,
        eventQuantity: 2,
      },
    });

    expectValidLeadResponse({
      response,
      customer: customer2,
      clickId: trackedClickId,
    });
  });

  test("track a lead with mode = 'wait' + track a sale right after", async () => {
    const customer3 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: trackedClickId,
        eventName: "Mode=Wait Signup",
        externalId: customer3.externalId,
        customerName: customer3.name,
        customerEmail: customer3.email,
        customerAvatar: customer3.avatar,
        mode: "wait",
      },
    });
    expectValidLeadResponse({
      response,
      customer: customer3,
      clickId: trackedClickId,
    });

    const saleResponse = await http.post<TrackSaleResponse>({
      path: "/track/sale",
      body: {
        externalId: customer3.externalId,
        eventName: "Mode=Wait Purchase",
        amount: 500,
        paymentProcessor: "stripe",
      },
    });

    expect(saleResponse.status).toEqual(200);
  });

  test("track a lead with `customerId` (backward compatibility)", async () => {
    const customer4 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: trackedClickId,
        customerId: customer4.externalId,
        eventName: "Signup",
        customerName: customer4.name,
        customerEmail: customer4.email,
        customerAvatar: customer4.avatar,
      },
    });

    expectValidLeadResponse({
      response,
      customer: customer4,
      clickId: trackedClickId,
    });
  });
});
