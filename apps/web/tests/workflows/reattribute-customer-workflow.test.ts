import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import {
  CommissionResponse,
  Customer,
  CustomerEnriched,
  EnrolledPartnerProps,
} from "@/lib/types";
import { sleep } from "@dub/utils";
import { describe, expect, onTestFinished, test } from "vitest";

import { randomCustomer, randomPartnerEmail } from "../utils/helpers";
import { IntegrationHarness } from "../utils/integration";
import { E2E_PARTNER_GROUP } from "../utils/resource";
import { trackE2ELead } from "./utils/track-e2e-lead";
import { verifyReattributeCompleted } from "./utils/verify-reattribute-completed";

describe.sequential("Workflow - ReattributeCustomer", async () => {
  const h = new IntegrationHarness();
  const { http } = await h.init();

  async function createEnrolledPartner(label: string) {
    const { status, data: partner } = await http.post<EnrolledPartnerProps>({
      path: "/partners",
      body: {
        name: `E2E Reattribute ${label}`,
        email: randomPartnerEmail(),
        groupId: E2E_PARTNER_GROUP.id,
      },
    });

    expect(status).toEqual(201);
    expect(partner.links).not.toBeNull();
    expect(partner.links!.length).toBeGreaterThan(0);

    return partner;
  }

  async function createManualCustomer() {
    const body = {
      ...randomCustomer(),
      country: "US",
    };

    const { status, data: customer } = await http.post<Customer>({
      path: "/customers",
      body,
    });

    expect(status).toEqual(201);
    return customer;
  }

  function cleanupCustomers(...ids: Array<string | undefined>) {
    onTestFinished(async () => {
      await Promise.all(
        ids
          .filter((id): id is string => Boolean(id))
          .map((id) => h.deleteCustomer(id).catch(() => undefined)),
      );
    });
  }

  async function waitForCustomerByExternalId(externalId: string) {
    const startTime = Date.now();

    while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
      const { status, data: customers } = await http.get<CustomerEnriched[]>({
        path: "/customers",
        query: {
          externalId,
          includeExpandedFields: "true",
        },
      });

      if (status === 200 && customers.length > 0) {
        return customers[0];
      }

      await sleep(VITEST_POLL_INTERVAL_MS);
    }

    throw new Error(
      `Customer with externalId ${externalId} was not found within ${VITEST_TEST_TIMEOUT_MS / 1000}s.`,
    );
  }

  async function tryFindCommissions(
    customerId: string,
    maxWaitMs = 30_000,
  ): Promise<CommissionResponse[]> {
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitMs) {
      const { status, data: commissions } = await http.get<
        CommissionResponse[]
      >({
        path: "/commissions",
        query: { customerId },
      });

      if (status === 200 && commissions.length > 0) {
        return commissions;
      }

      await sleep(VITEST_POLL_INTERVAL_MS);
    }

    return [];
  }

  test(
    "Fast path reattributes a manual customer in place",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const partner = await createEnrolledPartner("fast-path");
      const targetLink = partner.links![0];
      const customer = await createManualCustomer();
      cleanupCustomers(customer.id);

      const { status, data: reattributed } = await http.post<CustomerEnriched>({
        path: `/customers/${customer.id}/reattribute`,
        body: {
          partnerId: partner.id,
          linkId: targetLink.id,
        },
      });

      expect(status).toEqual(200);
      expect(reattributed.id).toEqual(customer.id);
      expect(reattributed.partner?.id).toEqual(partner.id);
      expect(reattributed.link?.id).toEqual(targetLink.id);

      const { status: getStatus, data: fetched } =
        await http.get<CustomerEnriched>({
          path: `/customers/${customer.id}`,
          query: { includeExpandedFields: "true" },
        });

      expect(getStatus).toEqual(200);
      expect(fetched.id).toEqual(customer.id);
      expect(fetched.partner?.id).toEqual(partner.id);
      expect(fetched.link?.id).toEqual(targetLink.id);
    },
  );

  test(
    "Lead reattribute creates a new customer and moves attribution",
    { timeout: VITEST_TEST_TIMEOUT_MS * 2 },
    async () => {
      const sourcePartner = await createEnrolledPartner("lead-source");
      const targetPartner = await createEnrolledPartner("lead-target");
      const sourceLink = sourcePartner.links![0];
      const targetLink = targetPartner.links![0];

      const { customerExternalId } = await trackE2ELead(http, sourceLink);
      const sourceCustomer =
        await waitForCustomerByExternalId(customerExternalId);
      cleanupCustomers(sourceCustomer.id);

      expect(sourceCustomer.partner?.id).toEqual(sourcePartner.id);
      expect(sourceCustomer.link?.id).toEqual(sourceLink.id);

      const existingCommissions = await tryFindCommissions(sourceCustomer.id);

      const { status, data: reattributed } = await http.post<CustomerEnriched>({
        path: `/customers/${sourceCustomer.id}/reattribute`,
        body: {
          partnerId: targetPartner.id,
          linkId: targetLink.id,
        },
      });

      expect(status).toEqual(200);
      expect(reattributed.id).not.toEqual(sourceCustomer.id);
      cleanupCustomers(reattributed.id);

      await verifyReattributeCompleted({
        http,
        oldCustomerId: sourceCustomer.id,
        newCustomerId: reattributed.id,
        targetPartnerId: targetPartner.id,
        targetLinkId: targetLink.id,
        expectTransferredCommission: existingCommissions.length > 0,
      });
    },
  );

  test(
    "Reattributing to the same partner and link is rejected",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const partner = await createEnrolledPartner("noop");
      const targetLink = partner.links![0];
      const customer = await createManualCustomer();
      cleanupCustomers(customer.id);

      const { status: firstStatus } = await http.post<CustomerEnriched>({
        path: `/customers/${customer.id}/reattribute`,
        body: {
          partnerId: partner.id,
          linkId: targetLink.id,
        },
      });
      expect(firstStatus).toEqual(200);

      const { status, data } = await http.post({
        path: `/customers/${customer.id}/reattribute`,
        body: {
          partnerId: partner.id,
          linkId: targetLink.id,
        },
      });

      expect(status).toEqual(400);
      expect(data).toMatchObject({
        error: {
          code: "bad_request",
          message: "Customer is already attributed to this partner and link.",
        },
      });
    },
  );

  test(
    "Reattributing with a link that does not belong to the partner is rejected",
    { timeout: VITEST_TEST_TIMEOUT_MS },
    async () => {
      const partner = await createEnrolledPartner("bad-link-partner");
      const otherPartner = await createEnrolledPartner("bad-link-other");
      const customer = await createManualCustomer();
      cleanupCustomers(customer.id);

      const { status, data } = await http.post({
        path: `/customers/${customer.id}/reattribute`,
        body: {
          partnerId: partner.id,
          linkId: otherPartner.links![0].id,
        },
      });

      expect(status).toEqual(422);
      expect(data).toMatchObject({
        error: {
          code: "unprocessable_entity",
          message:
            "The selected referral link does not belong to this partner in the program.",
        },
      });
    },
  );
});
