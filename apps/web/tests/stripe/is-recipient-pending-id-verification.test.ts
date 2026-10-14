import { isRecipientPendingIdVerification } from "@/lib/stripe/is-recipient-pending-id-verification";
import { retrieveAccountOutputSchema } from "@/lib/stripe/stripe-v2-schemas";
import { describe, expect, test } from "vitest";

const recipientVerificationAccount = {
  id: "acct_test",
  closed: false,
  configuration: {
    recipient: {
      applied: true,
      capabilities: {
        stripe_balance: null,
      },
    },
  },
  requirements: {
    entries: [
      {
        awaiting_action_from: "stripe",
        description: "recipient.recipient_verification",
        errors: [],
        impact: {
          restricts_capabilities: [
            {
              capability: "crypto_wallets",
              configuration: "recipient",
              deadline: {
                status: "past_due",
              },
            },
          ],
          restricts_features: [
            {
              configuration: "recipient",
              deadline: {
                status: "past_due",
              },
              feature: "crypto_wallets",
            },
          ],
          restricts_payouts: null,
        },
        minimum_deadline: {
          status: "past_due",
        },
        reference: null,
        requested_reasons: [
          {
            code: "routine_verification",
          },
        ],
      },
    ],
    summary: {
      minimum_deadline: {
        status: "past_due",
        time: null,
      },
    },
  },
};

describe("isRecipientPendingIdVerification", () => {
  test("detects crypto_wallets restricted while Stripe still owns the requirement", () => {
    const account = retrieveAccountOutputSchema.parse(
      recipientVerificationAccount,
    );

    expect(isRecipientPendingIdVerification(account)).toBe(true);
  });

  test("detects crypto_wallets status pending", () => {
    const account = retrieveAccountOutputSchema.parse({
      id: "acct_test",
      closed: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            crypto_wallets: {
              status: "pending",
              status_details: {
                code: "requirements_pending_verification",
              },
            },
          },
        },
      },
    });

    expect(isRecipientPendingIdVerification(account)).toBe(true);
  });

  test("ignores requirements the user still has to resolve", () => {
    const account = retrieveAccountOutputSchema.parse({
      ...recipientVerificationAccount,
      requirements: {
        ...recipientVerificationAccount.requirements,
        entries: [
          {
            ...recipientVerificationAccount.requirements.entries[0],
            awaiting_action_from: "user",
          },
        ],
      },
    });

    expect(isRecipientPendingIdVerification(account)).toBe(false);
  });

  test("ignores accounts that are not waiting on identity verification", () => {
    const account = retrieveAccountOutputSchema.parse({
      id: "acct_test",
      closed: false,
      configuration: {
        recipient: {
          applied: true,
          capabilities: {
            crypto_wallets: {
              status: "active",
            },
          },
        },
      },
      requirements: {
        entries: [],
      },
    });

    expect(isRecipientPendingIdVerification(account)).toBe(false);
  });
});
