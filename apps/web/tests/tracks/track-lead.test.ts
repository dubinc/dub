import { getLeadEvent } from "@/lib/tinybird";
import { TrackLeadResponse } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { randomCustomer } from "tests/utils/helpers";
import { E2E_CLICK_ID, E2E_WORKSPACE_ID } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("POST /track/lead", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();
  const customer = randomCustomer();

  test("track a lead", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        externalId: customer.id,
        customerName: customer.name,
        customerEmail: customer.email,
        customerAvatar: customer.avatar,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId: E2E_CLICK_ID,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAvatar: customer.avatar,
      click: {
        id: E2E_CLICK_ID,
      },
      customer: {
        name: customer.name,
        email: customer.email,
        avatar: customer.avatar,
        externalId: customer.id,
      },
    });
  });

  test("duplicate request with same externalId", async () => {
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        externalId: customer.id,
      },
    });

    expect(response.status).toEqual(409);
    expect(response.data).toStrictEqual({
      error: {
        code: "conflict",
        doc_url: "https://dub.co/docs/api-reference/errors#conflict",
        message: `Customer with externalId ${customer.id} and event name Signup has already been recorded.`,
      },
    });
  });

  test("track a lead with eventQuantity", async () => {
    const customer2 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Start Trial",
        externalId: customer2.id,
        customerName: customer2.name,
        customerEmail: customer2.email,
        customerAvatar: customer2.avatar,
        eventQuantity: 2,
      },
    });

    expect(response.status).toEqual(200);
    expect(response.data).toStrictEqual({
      clickId: E2E_CLICK_ID,
      customerName: customer2.name,
      customerEmail: customer2.email,
      customerAvatar: customer2.avatar,
      click: {
        id: E2E_CLICK_ID,
      },
      customer: {
        name: customer2.name,
        email: customer2.email,
        avatar: customer2.avatar,
        externalId: customer2.id,
      },
    });
  });

  test("track a lead with sync mode", async () => {
    const customer3 = randomCustomer();
    const response = await http.post<TrackLeadResponse>({
      path: "/track/lead",
      body: {
        clickId: E2E_CLICK_ID,
        eventName: "Signup",
        externalId: customer3.id,
        customerName: customer3.name,
        customerEmail: customer3.email,
        customerAvatar: customer3.avatar,
        mode: "sync",
      },
    });
    expect(response.status).toEqual(200);

    const createdCustomer = await prisma.customer.findUniqueOrThrow({
      where: {
        projectId_externalId: {
          projectId: E2E_WORKSPACE_ID.replace("ws_", ""),
          externalId: customer3.id,
        },
      },
      select: {
        id: true,
      },
    });
    const leadEvent = await getLeadEvent({ customerId: createdCustomer.id });
    expect(leadEvent.data.length).toEqual(1);
    expect(leadEvent.data[0].event_name).toEqual("Signup");
    expect(leadEvent.data[0].customer_id).toEqual(createdCustomer.id);
  });
});
