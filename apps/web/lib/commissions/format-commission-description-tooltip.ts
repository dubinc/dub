import { CLAWBACK_REASONS_MAP } from "@/lib/zod/schemas/commissions";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";

// Canonical payout IDs: `po_` + 25-char base32 ULID body.
const PAYOUT_ID_REGEX = /po_[0-9A-HJKMNP-TV-Z]{25}/g;

export type CommissionDescriptionTooltipContext =
  | { variant: "program"; workspaceSlug: string }
  | { variant: "partner" };

export function getCommissionDescriptionText(description: string): string {
  return CLAWBACK_REASONS_MAP[description]?.description ?? description;
}

export function formatCommissionDescriptionTooltip(
  description: string,
  context: CommissionDescriptionTooltipContext,
): string {
  const text = getCommissionDescriptionText(description);

  return text.replace(PAYOUT_ID_REGEX, (payoutId) => {
    const encodedPayoutId = encodeURIComponent(payoutId);
    const href =
      context.variant === "program"
        ? `${APP_DOMAIN}/${context.workspaceSlug}/program/payouts/${encodedPayoutId}`
        : `${PARTNERS_DOMAIN}/payouts?payoutId=${encodedPayoutId}`;

    return `[${payoutId}](${href})`;
  });
}
