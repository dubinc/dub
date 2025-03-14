import { CustomerEnriched } from "@/lib/types";
import { E2E_CUSTOMER_WITH_DISCOUNT, E2E_DISCOUNT } from "tests/utils/resource";
import { describe, expect, test } from "vitest";
import { IntegrationHarness } from "../utils/integration";

describe("Discounts", () => {
  test("/customers?email=", async () => {
    const h = new IntegrationHarness();
    const { http } = await h.init();

    const { status, data: customers } = await http.get<CustomerEnriched[]>({
      path: `/customers?email=${E2E_CUSTOMER_WITH_DISCOUNT.email}&includeExpandedFields=true`,
    });

    expect(status).toEqual(200);
    expect(customers[0].discount).toStrictEqual({
      ...E2E_DISCOUNT,
      duration: null,
      interval: null,
    });
  });

  test("/customers?externalId=", async () => {
    const h = new IntegrationHarness();
    const { http } = await h.init();

    const { status, data: customers } = await http.get<CustomerEnriched[]>({
      path: `/customers?externalId=${E2E_CUSTOMER_WITH_DISCOUNT.externalId}&includeExpandedFields=true`,
    });

    expect(status).toEqual(200);
    expect(customers[0].discount).toStrictEqual({
      ...E2E_DISCOUNT,
      duration: null,
      interval: null,
    });
  });

  test("/customers/:id", async () => {
    const h = new IntegrationHarness();
    const { http } = await h.init();

    const { status, data: customer } = await http.get<CustomerEnriched>({
      path: `/customers/${E2E_CUSTOMER_WITH_DISCOUNT.id}?includeExpandedFields=true`,
    });

    expect(status).toEqual(200);
    expect(customer.discount).toStrictEqual(E2E_DISCOUNT);
  });
});
