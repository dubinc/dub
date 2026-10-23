import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateCustomerWithStripeCustomerId } from "../../app/(ee)/api/stripe/integration/webhook/utils/update-customer-with-stripe-customer-id";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      update: mocks.update,
    },
  },
}));

const args = {
  workspaceId: "ws_test",
  dubCustomerExternalId: "user_123",
  stripeCustomerId: "cus_test",
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "test",
  });
}

describe("updateCustomerWithStripeCustomerId", () => {
  beforeEach(() => {
    mocks.update.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  test("links the Stripe customer ID to the customer with the externalId in the workspace", async () => {
    const customer = { id: "cus_dub", stripeCustomerId: "cus_test" };
    mocks.update.mockResolvedValue(customer);

    await expect(updateCustomerWithStripeCustomerId(args)).resolves.toBe(
      customer,
    );

    expect(mocks.update).toHaveBeenCalledWith({
      where: {
        projectId_externalId: {
          projectId: "ws_test",
          externalId: "user_123",
        },
      },
      data: {
        stripeCustomerId: "cus_test",
      },
    });
  });

  test("returns null without a Stripe customer ID", async () => {
    await expect(
      updateCustomerWithStripeCustomerId({ ...args, stripeCustomerId: null }),
    ).resolves.toBeNull();

    expect(mocks.update).not.toHaveBeenCalled();
  });

  test("returns null when no customer has the externalId (P2025)", async () => {
    mocks.update.mockRejectedValue(prismaError("P2025"));

    await expect(updateCustomerWithStripeCustomerId(args)).resolves.toBeNull();
  });

  test("returns null when another customer has the Stripe customer ID (P2002)", async () => {
    mocks.update.mockRejectedValue(prismaError("P2002"));

    await expect(updateCustomerWithStripeCustomerId(args)).resolves.toBeNull();
  });

  test("throws other Prisma errors so that Stripe retries the event", async () => {
    const error = prismaError("P1001"); // can't reach database server
    mocks.update.mockRejectedValue(error);

    await expect(updateCustomerWithStripeCustomerId(args)).rejects.toBe(error);
  });

  test("throws errors that are not Prisma errors", async () => {
    const error = new Error("Connection timed out");
    mocks.update.mockRejectedValue(error);

    await expect(updateCustomerWithStripeCustomerId(args)).rejects.toBe(error);
  });
});
