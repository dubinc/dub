import { remapDiscountCodesForPartner } from "@/lib/discounts/remap-discount-codes-for-partner";
import { DiscountProvider, RewardStructure } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const PROGRAM_ID = "prog_1";
const PARTNER_ID = "pn_1";

const mocks = vi.hoisted(() => ({
  findEnrollment: vi.fn(),
  findDiscountCodes: vi.fn(),
  updateDiscountCodes: vi.fn(),
  deleteDiscountCodes: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    programEnrollment: {
      findUnique: mocks.findEnrollment,
    },
    discountCode: {
      findMany: mocks.findDiscountCodes,
      updateMany: mocks.updateDiscountCodes,
    },
  },
}));

vi.mock("@/lib/discounts/delete-discount-code", () => ({
  deleteDiscountCodes: mocks.deleteDiscountCodes,
}));

function discount(overrides: Record<string, unknown> = {}) {
  return {
    id: "disc_old",
    couponId: "coupon_old",
    provider: DiscountProvider.stripe,
    amount: 10,
    type: RewardStructure.percentage,
    maxDuration: 6,
    ...overrides,
  };
}

function discountCode({
  id = "dcode_1",
  existingDiscount = discount(),
  linkDiscount = null,
}: {
  id?: string;
  existingDiscount?: ReturnType<typeof discount> | null;
  linkDiscount?: ReturnType<typeof discount> | null;
} = {}) {
  return {
    id,
    code: "PARTNER10",
    programId: PROGRAM_ID,
    partnerId: PARTNER_ID,
    linkId: "link_1",
    disabledAt: null,
    discount: existingDiscount,
    link: {
      id: "link_1",
      linkReward: linkDiscount ? { discount: linkDiscount } : null,
    },
  };
}

async function remap() {
  await remapDiscountCodesForPartner({
    programId: PROGRAM_ID,
    partnerId: PARTNER_ID,
  });
}

describe("remapDiscountCodesForPartner", () => {
  beforeEach(() => {
    mocks.findEnrollment.mockReset();
    mocks.findDiscountCodes.mockReset();
    mocks.updateDiscountCodes.mockReset().mockResolvedValue({ count: 1 });
    mocks.deleteDiscountCodes.mockReset().mockResolvedValue(undefined);
  });

  it("skips when the enrollment is missing", async () => {
    mocks.findEnrollment.mockResolvedValue(null);

    await remap();

    expect(mocks.findDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).not.toHaveBeenCalled();
  });

  it("skips when the partner has no active discount codes", async () => {
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: discount(),
    });
    mocks.findDiscountCodes.mockResolvedValue([]);

    await remap();

    expect(mocks.findDiscountCodes).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          programId: PROGRAM_ID,
          partnerId: PARTNER_ID,
          disabledAt: null,
        },
      }),
    );
    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).not.toHaveBeenCalled();
  });

  it("skips codes already pointing at the effective discount", async () => {
    const enrollmentDiscount = discount({ id: "disc_enroll" });
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: enrollmentDiscount,
    });
    mocks.findDiscountCodes.mockResolvedValue([
      discountCode({ existingDiscount: enrollmentDiscount }),
    ]);

    await remap();

    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).not.toHaveBeenCalled();
  });

  it("repoints equivalent codes onto the new discount", async () => {
    const enrollmentDiscount = discount({
      id: "disc_enroll",
      couponId: "coupon_old",
    });
    const code = discountCode({
      existingDiscount: discount({ id: "disc_old", couponId: "coupon_old" }),
    });
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: enrollmentDiscount,
    });
    mocks.findDiscountCodes.mockResolvedValue([code]);

    await remap();

    expect(mocks.updateDiscountCodes).toHaveBeenCalledWith({
      where: { id: code.id },
      data: { discountId: enrollmentDiscount.id },
    });
    expect(mocks.deleteDiscountCodes).not.toHaveBeenCalled();
  });

  it("deletes codes when the new discount is not equivalent", async () => {
    const enrollmentDiscount = discount({
      id: "disc_enroll",
      couponId: "coupon_new",
      amount: 20,
    });
    const code = discountCode();
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: enrollmentDiscount,
    });
    mocks.findDiscountCodes.mockResolvedValue([code]);

    await remap();

    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).toHaveBeenCalledWith([code]);
  });

  it("deletes codes when there is no enrollment or link discount", async () => {
    const code = discountCode();
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: null,
    });
    mocks.findDiscountCodes.mockResolvedValue([code]);

    await remap();

    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).toHaveBeenCalledWith([code]);
  });

  it("uses the link discount instead of the enrollment discount", async () => {
    const enrollmentDiscount = discount({ id: "disc_enroll" });
    const linkDiscount = discount({
      id: "disc_link",
      couponId: "coupon_link",
      amount: 25,
    });
    const code = discountCode({
      existingDiscount: enrollmentDiscount,
      linkDiscount,
    });
    mocks.findEnrollment.mockResolvedValue({
      id: "pge_1",
      discount: enrollmentDiscount,
    });
    mocks.findDiscountCodes.mockResolvedValue([code]);

    await remap();

    expect(mocks.updateDiscountCodes).not.toHaveBeenCalled();
    expect(mocks.deleteDiscountCodes).toHaveBeenCalledWith([code]);
  });
});
