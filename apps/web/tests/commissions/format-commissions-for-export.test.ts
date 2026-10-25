import { formatCommissionsForExport } from "@/lib/api/commissions/format-commissions-for-export";
import { describe, expect, test } from "vitest";

// 2026-10-07 22:59:59 UTC is 2026-10-08 06:59:59 in China (UTC+8), which is the
// case from the commissions export: the table showed Oct 8 and the CSV showed Oct 7.
const earlyMorningInChina = new Date("2026-10-07T22:59:59.000Z");
const paidAt = new Date("2026-10-09T01:02:03.000Z");

function commissionWithDates() {
  return {
    id: "cm_1",
    currency: "usd",
    amount: 499,
    earnings: 99,
    createdAt: earlyMorningInChina,
    updatedAt: earlyMorningInChina,
    payout: { paidAt },
    customer: {
      name: "Ada",
      email: "ada@example.com",
      externalId: null,
      stripeCustomerId: null,
    },
    partner: { name: "Melody", email: "melody@example.com" },
    programEnrollment: { tenantId: null },
  } as any;
}

describe("formatCommissionsForExport", () => {
  test("formats date columns in the export timezone", () => {
    const [row] = formatCommissionsForExport(
      [commissionWithDates()],
      ["createdAt", "updatedAt", "paidAt"],
      "Asia/Shanghai",
    );

    expect(row).toEqual({
      createdAt: "2026-10-08 06:59:59",
      updatedAt: "2026-10-08 06:59:59",
      paidAt: "2026-10-09 09:02:03",
    });
  });

  test("formats dates behind UTC in that timezone", () => {
    const [row] = formatCommissionsForExport(
      [commissionWithDates()],
      ["createdAt"],
      "America/Los_Angeles",
    );

    // October is PDT (UTC-7).
    expect(row.createdAt).toBe("2026-10-07 15:59:59");
  });

  test("falls back to UTC when timezone is missing or invalid", () => {
    const columns = ["createdAt"];
    const commissions = [commissionWithDates()];

    expect(formatCommissionsForExport(commissions, columns)[0].createdAt).toBe(
      "2026-10-07 22:59:59",
    );
    expect(
      formatCommissionsForExport(commissions, columns, "Not/AZone")[0]
        .createdAt,
    ).toBe("2026-10-07 22:59:59");
  });

  test("leaves an empty paid date blank", () => {
    const [row] = formatCommissionsForExport(
      [{ ...commissionWithDates(), payout: null }],
      ["paidAt"],
      "Asia/Shanghai",
    );

    expect(row.paidAt).toBe("");
  });
});
