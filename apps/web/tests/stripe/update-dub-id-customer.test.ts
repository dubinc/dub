import { Customer, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateDubIdCustomer } from "../../app/(ee)/api/stripe/integration/webhook/utils/update-dub-id-customer";

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

const clickCustomer = {
  id: "cus_click",
  externalId: "click_123",
  stripeCustomerId: null,
} as Customer;

const data = {
  externalId: "cus_stripe",
  stripeCustomerId: "cus_stripe",
  clickId: "click_123",
  linkId: "link_123",
};

const args = {
  customer: clickCustomer,
  stripeCustomerOwner: null,
  data,
};

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: "test",
  });
}

describe("updateDubIdCustomer", () => {
  beforeEach(() => {
    mocks.update.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  test("updates the matched customer when no customer owns the Stripe customer ID", async () => {
    const updated = { ...clickCustomer, ...data };
    mocks.update.mockResolvedValue(updated);

    await expect(updateDubIdCustomer(args)).resolves.toBe(updated);

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "cus_click" },
      data,
    });
  });

  test("updates the customer that owns the Stripe customer ID", async () => {
    const stripeCustomerOwner = {
      id: "cus_owner",
      stripeCustomerId: "cus_stripe",
    } as Customer;
    mocks.update.mockResolvedValue(stripeCustomerOwner);

    await expect(
      updateDubIdCustomer({ ...args, stripeCustomerOwner }),
    ).resolves.toBe(stripeCustomerOwner);

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "cus_owner" },
      data,
    });
  });

  test("retries without externalId when another customer has it (P2002)", async () => {
    const { externalId, ...rest } = data;
    const updated = { ...clickCustomer, ...rest };
    mocks.update
      .mockRejectedValueOnce(prismaError("P2002"))
      .mockResolvedValueOnce(updated);

    await expect(updateDubIdCustomer(args)).resolves.toBe(updated);

    expect(mocks.update).toHaveBeenLastCalledWith({
      where: { id: "cus_click" },
      data: rest,
    });
  });

  test("throws other Prisma errors so that Stripe retries the event", async () => {
    const error = prismaError("P1001"); // can't reach database server
    mocks.update.mockRejectedValue(error);

    await expect(updateDubIdCustomer(args)).rejects.toBe(error);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
