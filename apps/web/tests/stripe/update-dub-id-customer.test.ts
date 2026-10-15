import { Customer, Prisma } from "@prisma/client";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { updateDubIdCustomer } from "../../app/(ee)/api/stripe/integration/webhook/utils/update-dub-id-customer";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: {
      findUnique: mocks.findUnique,
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
  workspaceId: "ws_test",
  stripeCustomerId: "cus_stripe",
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
    mocks.findUnique.mockReset();
    mocks.update.mockReset();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  test("updates the matched customer when no customer owns the Stripe customer ID", async () => {
    const updated = { ...clickCustomer, ...data };
    mocks.findUnique.mockResolvedValue(null);
    mocks.update.mockResolvedValue(updated);

    await expect(updateDubIdCustomer(args)).resolves.toBe(updated);

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: {
        stripeCustomerId: "cus_stripe",
        projectId: "ws_test",
      },
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "cus_click" },
      data,
    });
  });

  test("updates the customer that owns the Stripe customer ID", async () => {
    const stripeCustomer = {
      id: "cus_owner",
      stripeCustomerId: "cus_stripe",
    } as Customer;
    mocks.findUnique.mockResolvedValue(stripeCustomer);
    mocks.update.mockResolvedValue(stripeCustomer);

    await expect(updateDubIdCustomer(args)).resolves.toBe(stripeCustomer);

    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "cus_owner" },
      data,
    });
  });

  test("skips the lookup when the matched customer owns the Stripe customer ID", async () => {
    const customer = { ...clickCustomer, stripeCustomerId: "cus_stripe" };
    mocks.update.mockResolvedValue(customer);

    await updateDubIdCustomer({ ...args, customer });

    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  test("skips the lookup without a Stripe customer ID", async () => {
    mocks.update.mockResolvedValue(clickCustomer);

    await updateDubIdCustomer({ ...args, stripeCustomerId: null });

    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  test("retries without externalId when another customer has it (P2002)", async () => {
    const { externalId, ...rest } = data;
    const updated = { ...clickCustomer, ...rest };
    mocks.findUnique.mockResolvedValue(null);
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
    mocks.findUnique.mockResolvedValue(null);
    mocks.update.mockRejectedValue(error);

    await expect(updateDubIdCustomer(args)).rejects.toBe(error);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
