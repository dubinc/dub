import { canChangeEmail } from "@/lib/email/can-change-email";
import { getEmailDomainBlockFlags } from "@/lib/email/get-email-domain-block-flags";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email/get-email-domain-block-flags", () => ({
  getEmailDomainBlockFlags: vi.fn(),
}));

const getEmailDomainBlockFlagsMock = vi.mocked(getEmailDomainBlockFlags);

describe("canChangeEmail", () => {
  beforeEach(() => {
    getEmailDomainBlockFlagsMock.mockReset();
  });

  it("always rejects disposable domains", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: true,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@tempmail.com",
      }),
    ).resolves.toBe(false);
  });

  it("rejects when current email is generic with a + alias", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user+alias@gmail.com",
        newEmail: "user@acme.com",
      }),
    ).resolves.toBe(false);
  });

  it("rejects when new email matches blocked terms", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: true,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@gmail.com",
      }),
    ).resolves.toBe(false);
  });

  it("allows when neither plus-alias nor terms apply", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@newco.com",
      }),
    ).resolves.toBe(true);
  });
});
