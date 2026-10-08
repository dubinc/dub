import {
  createDiscountCodeSchema,
  restrictedDiscountCodeSchema,
} from "@/lib/zod/schemas/discount";
import { describe, expect, it } from "vitest";

describe("restrictedDiscountCodeSchema", () => {
  it("rejects characters outside letters, numbers, dashes, and underscores", () => {
    const result = restrictedDiscountCodeSchema.safeParse({
      code: "NOT VALID!",
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Code can only contain letters, numbers, dashes, and underscores.",
      );
    }
  });

  it("accepts letters, numbers, dashes, and underscores", () => {
    expect(
      restrictedDiscountCodeSchema.parse({ code: "PARTNER_10-OFF" }).code,
    ).toBe("PARTNER_10-OFF");
  });
});

describe("createDiscountCodeSchema", () => {
  it("allows any characters so custom provider codes are not rejected up front", () => {
    expect(
      createDiscountCodeSchema.parse({
        partnerId: "pn_x",
        linkId: "link_x",
        code: "SAVE@10.OFF!",
      }).code,
    ).toBe("SAVE@10.OFF!");
  });

  it("still rejects codes longer than 100 characters", () => {
    const result = createDiscountCodeSchema.safeParse({
      partnerId: "pn_x",
      linkId: "link_x",
      code: "A".repeat(101),
    });

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(
        "Code must be 100 characters or fewer.",
      );
    }
  });
});
