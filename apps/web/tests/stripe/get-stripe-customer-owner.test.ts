import { beforeEach, describe, expect, test, vi } from "vitest";
import { getStripeCustomerOwner } from "../../app/(ee)/api/stripe/integration/webhook/utils/get-stripe-customer-owner";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.findUnique,
    },
  },
}));

const args = {
  workspaceId: "ws_test",
  stripeCustomerId: "cus_stripe",
};

describe("getStripeCustomerOwner", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
  });

  test("returns the owner in the workspace", async () => {
    const customer = { id: "cus_owner", projectId: "ws_test" };
    mocks.findUnique.mockResolvedValue(customer);

    await expect(getStripeCustomerOwner(args)).resolves.toEqual({
      stripeCustomerOwner: customer,
      linkableStripeCustomerId: "cus_stripe",
    });

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_stripe" },
    });
  });

  test("allows linking the Stripe customer ID when no customer owns it", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(getStripeCustomerOwner(args)).resolves.toEqual({
      stripeCustomerOwner: null,
      linkableStripeCustomerId: "cus_stripe",
    });
  });

  test("ignores the Stripe customer ID when another workspace owns it", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "cus_other",
      projectId: "ws_other",
    });

    await expect(getStripeCustomerOwner(args)).resolves.toEqual({
      stripeCustomerOwner: null,
      linkableStripeCustomerId: null,
    });
  });

  test("skips the lookup without a Stripe customer ID", async () => {
    await expect(
      getStripeCustomerOwner({ ...args, stripeCustomerId: null }),
    ).resolves.toEqual({
      stripeCustomerOwner: null,
      linkableStripeCustomerId: null,
    });

    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
});
