import { CLAWBACK_REASONS_MAP } from "@/lib/zod/schemas/commissions";
import { APP_DOMAIN, PARTNERS_DOMAIN } from "@dub/utils";

const PAYOUT_ID_REGEX = /po_[^\s]+/g;

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
    const href =
      context.variant === "program"
        ? `${APP_DOMAIN}/${context.workspaceSlug}/program/payouts/${payoutId}`
        : `${PARTNERS_DOMAIN}/payouts?payoutId=${payoutId}`;

    return `[${payoutId}](${href})`;
  });
}
