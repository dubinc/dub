type CryptoWalletCapability = {
  status?: string | null;
  status_details?: {
    code?: string | null;
  } | null;
};

type RequirementEntry = {
  awaiting_action_from?: string | null;
  impact?: {
    restricts_capabilities?:
      | {
          capability?: string | null;
          configuration?: string | null;
        }[]
      | null;
  } | null;
};

function restrictsCryptoWallets(entry: RequirementEntry) {
  return entry.impact?.restricts_capabilities?.some(
    (restriction) =>
      restriction?.capability === "crypto_wallets" &&
      restriction?.configuration === "recipient",
  );
}

// Accounts v2: `crypto_wallets.status` of `pending` means Stripe is verifying
// that capability's requirements. The capability can also be omitted while an
// open requirement restricts it and `awaiting_action_from` is `stripe`.
export function isRecipientPendingIdVerification(
  account: {
    configuration?: {
      recipient?: {
        capabilities?: Record<string, CryptoWalletCapability | null> | null;
      } | null;
    } | null;
    requirements?: {
      entries?: unknown[] | null;
    } | null;
  } | null,
) {
  const cryptoWallets =
    account?.configuration?.recipient?.capabilities?.crypto_wallets;

  if (cryptoWallets?.status === "pending") {
    return true;
  }

  const entries = account?.requirements?.entries;

  if (!entries?.length) {
    return false;
  }

  return entries.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }

    const requirement = entry as RequirementEntry;

    return (
      requirement.awaiting_action_from === "stripe" &&
      Boolean(restrictsCryptoWallets(requirement))
    );
  });
}
