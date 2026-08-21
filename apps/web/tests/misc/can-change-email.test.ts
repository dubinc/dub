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
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(false);

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@tempmail.com",
        hasPartnerAccount: false,
      }),
    ).resolves.toBe(false);
  });

  it("allows partners to change to consumer inboxes even when terms match", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: true,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@gmail.com",
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(true);

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@outlook.com",
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(true);
  });

  it("rejects partners from non-consumer destinations that match terms", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: true,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@bannedcorp.com",
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(false);
  });

  it("allows partners to leave a generic + alias", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user+alias@gmail.com",
        newEmail: "user@gmail.com",
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(true);
  });

  it("allows partners to change to non-consumer destinations that do not match terms", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@newco.com",
        hasPartnerAccount: true,
      }),
    ).resolves.toBe(true);
  });

  it("rejects non-partners when current email is generic with a + alias", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user+alias@gmail.com",
        newEmail: "user@acme.com",
        hasPartnerAccount: false,
      }),
    ).resolves.toBe(false);
  });

  it("rejects non-partners when new email matches blocked terms", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: true,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@gmail.com",
        hasPartnerAccount: false,
      }),
    ).resolves.toBe(false);
  });

  it("allows non-partners when neither plus-alias nor terms apply", async () => {
    getEmailDomainBlockFlagsMock.mockResolvedValue({
      isDisposable: false,
      matchesBlockedTerms: false,
    });

    await expect(
      canChangeEmail({
        currentEmail: "user@acme.com",
        newEmail: "user@newco.com",
        hasPartnerAccount: false,
      }),
    ).resolves.toBe(true);
  });
});
