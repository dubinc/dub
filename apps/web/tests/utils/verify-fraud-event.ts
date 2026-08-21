import { Customer } from "@/lib/types";
import { fraudEventSchemas } from "@/lib/zod/schemas/fraud";
import { FraudRuleType, Partner } from "@prisma/client";
import { HttpClient } from "tests/utils/http";
import { expect } from "vitest";
import * as z from "zod/v4";

import {
  VITEST_POLL_INTERVAL_MS,
  VITEST_TEST_TIMEOUT_MS,
} from "@/lib/constants/misc";

export const verifyFraudEvent = async ({
  http,
  partner,
  customer,
  ruleType,
  metadata,
}: {
  http: HttpClient;
  partner: Pick<Partner, "id" | "name" | "email" | "image">;
  customer: Pick<Customer, "externalId">;
  ruleType: FraudRuleType;
  metadata?: Record<string, unknown>;
}) => {
  // Resolve customerId from customerExternalID
  const { data: customers } = await http.get<Customer[]>({
    path: "/customers",
    query: { externalId: customer.externalId },
  });

  expect(customers.length).toBeGreaterThan(0);

  // Poll for fraud event every 5 seconds, timeout after 60 seconds
  const startTime = Date.now();
  let fraudEvent:
    | z.infer<(typeof fraudEventSchemas)[keyof typeof fraudEventSchemas]>
    | undefined;

  while (Date.now() - startTime < VITEST_TEST_TIMEOUT_MS) {
    const { status, data } = await http.get<
      z.infer<(typeof fraudEventSchemas)[keyof typeof fraudEventSchemas]>[]
    >({
      path: "/fraud/events",
      query: {
        customerId: customers[0].id,
        type: ruleType,
      },
    });

    if (status === 200 && data.length > 0) {
      fraudEvent = data[0];
      break;
    }

    // Wait before next poll
    await new Promise((resolve) =>
      setTimeout(resolve, VITEST_POLL_INTERVAL_MS),
    );
  }

  if (!fraudEvent) {
    throw new Error(
      `Fraud event not found within ${VITEST_TEST_TIMEOUT_MS / 1000} seconds. ` +
        `Query: ${JSON.stringify({ customerId: customers[0].id, type: ruleType })}`,
    );
  }

  // Assert fraud event shape
  expect(fraudEvent).toStrictEqual({
    createdAt: expect.any(String),
    partner: expect.objectContaining({
      id: partner.id,
      name: partner.name,
      email: partner.email,
      image: partner.image,
    }),
    ...(metadata && { metadata }),
    customer: expect.objectContaining({
      id: customers[0].id,
      name: customers[0].name,
      email: customers[0].email,
      avatar: customers[0].avatar,
    }),
  });
};
