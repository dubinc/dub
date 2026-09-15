import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { formatPartnerCustomersForExport } from "@/lib/customers/api/format-partner-customers-export";
import { describe, expect, test, vi } from "vitest";

vi.mock("@/lib/names", () => ({
  generateRandomName: () => "Random Placeholder",
}));

const createdAt = new Date("2026-01-01T00:00:00.000Z");
const firstSaleAt = new Date("2026-01-02T00:00:00.000Z");

const partnerCustomer = {
  id: "cus_123",
  name: "Ada Lovelace",
  email: "ada@example.com",
  country: "US",
  saleAmount: 12000,
  createdAt,
  subscriptionCanceledAt: null,
  link: { shortLink: "https://dub.sh/ada", url: "https://example.com" },
  commissions: [{ createdAt: firstSaleAt }],
};

describe("formatPartnerCustomersForExport", () => {
  test("obfuscates email and omits name when sharing is off", () => {
    const [row] = formatPartnerCustomersForExport(
      [partnerCustomer],
      ["id", "email", "name", "saleAmount"],
      { customerDataSharingEnabledAt: null },
    );

    expect(row.email).toBe(obfuscateCustomerEmail("ada@example.com"));
    expect(row).not.toHaveProperty("name");
    expect(row.saleAmount).toBe("$120.00");
  });

  test("includes name and real email when sharing is enabled", () => {
    const [row] = formatPartnerCustomersForExport(
      [partnerCustomer],
      ["id", "email", "name", "saleAmount"],
      { customerDataSharingEnabledAt: new Date("2026-01-01") },
    );

    expect(row).toEqual({
      id: "cus_123",
      email: "ada@example.com",
      name: "Ada Lovelace",
      saleAmount: "$120.00",
    });
  });

  test("does not leak the customer name into email when sharing is off and email is missing", () => {
    const [row] = formatPartnerCustomersForExport(
      [{ ...partnerCustomer, email: null }],
      ["id", "email", "name"],
      { customerDataSharingEnabledAt: null },
    );

    expect(row.email).toBe("Random Placeholder");
    expect(row.email).not.toBe("Ada Lovelace");
    expect(row).not.toHaveProperty("name");
  });

  test("omits saleAmount when the program excludes LTV", () => {
    const [row] = formatPartnerCustomersForExport(
      [partnerCustomer],
      ["id", "email", "saleAmount"],
      {
        customerDataSharingEnabledAt: new Date("2026-01-01"),
        ltvExcluded: true,
      },
    );

    expect(row).toEqual({
      id: "cus_123",
      email: "ada@example.com",
    });
    expect(row).not.toHaveProperty("saleAmount");
  });
});
