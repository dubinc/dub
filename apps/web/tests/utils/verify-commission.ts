import { CommissionResponse, Customer } from "@/lib/types";
import { expect } from "vitest";
import { HttpClient } from "./http";

export const verifyCommission = async ({
  http,
  customerExternalId,
  expectedEarnings,
}: {
  http: HttpClient;
  customerExternalId: string;
  expectedEarnings: number;
}) => {
  // Find the customer first
  const { data: customers } = await http.get<Customer[]>({
    path: "/customers",
    query: {
      externalId: customerExternalId,
    },
  });

  const customer = customers[0];

  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Find the commission for the customer
  const { status, data: commissions } = await http.get<CommissionResponse[]>({
    path: "/commissions",
    query: {
      customerId: customer.id,
    },
  });

  expect(status).toEqual(200);
  expect(commissions).toHaveLength(1);
  expect(commissions[0].customer?.id).toEqual(customer.id);
  expect(commissions[0].earnings).toEqual(expectedEarnings);
};
