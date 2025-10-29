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

  // Pause for 1.5 seconds for data to be fully processed
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Optional: resolve customer ID if customerExternalId is given
  if (customerExternalId) {
    const { data: customers } = await http.get<Customer[]>({
      path: "/customers",
      query: { externalId: customerExternalId },
    });

    expect(customers.length).toBeGreaterThan(0);
    customerId = customers[0].id;

    // Small delay if necessary for async commission processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  const query: Record<string, string> = {};

  if (invoiceId) {
    query.invoiceId = invoiceId;
  }

  if (customerId) {
    query.customerId = customerId;
  }

  const { status, data: commissions } = await http.get<CommissionResponse[]>({
    path: "/commissions",
    query,
  });

  expect(status).toEqual(200);
  expect(commissions).toHaveLength(1);

  const commission = commissions[0];

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
};
