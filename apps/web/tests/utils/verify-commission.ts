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
  invoiceId?: string; // fetch commission by invoiceId
  description?: string; // fetch commissions + filter by description
  expectedSaleAmount?: number;
  expectedEarnings: number;
  expectedType?: string;
  query?: Record<string, string>; // to pass additional query params to GET /commissions
}

export const verifyCommission = async ({
  http,
  customerExternalId,
  invoiceId,
  description,
  expectedSaleAmount,
  expectedEarnings,
  expectedType,
  query: queryOverrides,
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

  const query: Record<string, string> = {
    ...queryOverrides,
  };

  if (invoiceId) {
    query.invoiceId = invoiceId;
  }

  if (customerId) {
    query.customerId = customerId;
  }
  const findMatchingCommission = (
    commissions: CommissionResponse[],
  ): CommissionResponse | undefined => {
    if (description) {
      return commissions.find((c) => c.description === description);
    }

    if (commissions.length === 1) {
      return commissions[0];
    }

    return undefined;
  };

  // Poll for commission every 5 seconds, timeout after 60 seconds
  const startTime = Date.now();

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const { status, data: commissions } = await http.get<CommissionResponse[]>({
      path: "/commissions",
      query,
    });

    const commission = findMatchingCommission(commissions);

    if (status === 200 && commission) {
      if (invoiceId) {
        expect(commission.invoiceId).toEqual(invoiceId);
      }

      if (customerId) {
        expect(commission.customer?.id).toEqual(customerId);
      }

      if (expectedSaleAmount !== undefined) {
        expect(commission.amount).toEqual(expectedSaleAmount);
      }

      expect(commission.earnings).toEqual(expectedEarnings);

      if (expectedType) {
        expect(commission.type).toEqual(expectedType);
      }

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
      `Query: ${JSON.stringify(query)}` +
      (description ? `, description: ${description}` : ""),
  );
};
