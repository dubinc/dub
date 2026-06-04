import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";
import { CommissionResponse, Customer } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "./http";

interface VerifyCommissionProps {
  http: HttpClient;
  customerExternalId?: string;
  invoiceId?: string;
  expectedAmount?: number;
  expectedEarnings: number;
}

export const verifyCommission = async ({
  http,
  customerExternalId,
  invoiceId,
  expectedAmount,
  expectedEarnings,
}: VerifyCommissionProps) => {
  let customerId: string | undefined;

  // Resolve customer ID (scoped by projectId — externalId is unique per project)
  if (customerExternalId) {
    const { data: customers } = await http.get<Customer[]>({
      path: "/customers",
      query: { externalId: customerExternalId },
    });

    expect(customers.length).toBeGreaterThan(0);
    customerId = customers[0].id;
  }

  const query: Record<string, string> = {};

  if (invoiceId) {
    query.invoiceId = invoiceId;
  }

  if (customerId) {
    query.customerId = customerId;
  }

  // Poll for commission every 5 seconds, timeout after 60 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const { status, data: commissions } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query,
    });

    if (status === 200 && commissions.length === 1) {
      const commission = commissions[0];

      // Verify all expectations
      if (invoiceId) {
        expect(commission.invoiceId).toEqual(invoiceId);
      }

      if (customerId) {
        expect(commission.customer?.id).toEqual(customerId);
      }

      if (expectedAmount !== undefined) {
        expect(commission.amount).toEqual(expectedAmount);
      }

      expect(commission.earnings).toEqual(expectedEarnings);

      return;
    }

    // Wait before next poll
    await new Promise((resolve) =>
      setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
    );
  }

  // Timeout reached - fail the test
  throw new Error(
    `Commission not found within ${VITEST_TEST_TIMEOUT_MS / 1000} seconds. ` +
      `Query: ${JSON.stringify(query)}`,
  );
};
