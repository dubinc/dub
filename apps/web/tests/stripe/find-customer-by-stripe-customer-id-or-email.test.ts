import { beforeEach, describe, expect, test, vi } from "vitest";
import { findCustomerByStripeCustomerIdOrEmail } from "../../app/(ee)/api/stripe/integration/webhook/utils/find-customer-by-stripe-customer-id-or-email";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
    },
  },
}));

const args = {
  workspaceId: "ws_test",
  stripeCustomerId: "cus_stripe",
  email: "user@example.com",
};

describe("findCustomerByStripeCustomerIdOrEmail", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.findFirst.mockReset();
  });

  test("returns the customer that owns the Stripe customer ID", async () => {
    const customer = { id: "cus_owner", stripeCustomerId: "cus_stripe" };
    mocks.findUnique.mockResolvedValue(customer);

    await expect(findCustomerByStripeCustomerIdOrEmail(args)).resolves.toBe(
      customer,
    );

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { stripeCustomerId: "cus_stripe" },
    });
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  test("falls back to the customer with the email in the workspace", async () => {
    const customer = { id: "cus_email", stripeCustomerId: null };
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue(customer);

    await expect(findCustomerByStripeCustomerIdOrEmail(args)).resolves.toBe(
      customer,
    );

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { projectId: "ws_test", email: "user@example.com" },
    });
  });

  test("returns null without an email when no customer owns the Stripe customer ID", async () => {
    mocks.findUnique.mockResolvedValue(null);

    await expect(
      findCustomerByStripeCustomerIdOrEmail({ ...args, email: null }),
    ).resolves.toBeNull();

    expect(mocks.findFirst).not.toHaveBeenCalled();
  });
});
