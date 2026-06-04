import {
  getApplicationSourceLabelTooltip,
  isMarketplaceReferralSource,
} from "@/lib/application-events/utils";
import { BadgeCheck2Fill, Tooltip } from "@dub/ui";
import { cn } from "@dub/utils";

export function PartnerApplicationSource({
  referralSource,
  variant = "default",
}: {
  referralSource: string | null | undefined;
  variant?: "default" | "inline";
}) {
  const { label, tooltip } = getApplicationSourceLabelTooltip(referralSource);

  if (!label) {
    return variant === "inline" ? null : "-";
  }

  const isMarketplace = isMarketplaceReferralSource(referralSource);

  const labelContent = (
    <span
      className={cn(
        variant === "inline" &&
          "cursor-help underline decoration-dotted underline-offset-2",
      )}
    >
      {label}
    </span>
  );

  const labeledWithTooltip = tooltip ? (
    <Tooltip content={tooltip}>{labelContent}</Tooltip>
  ) : (
    labelContent
  );

  if (variant === "inline") {
    return (
      <span className="inline-flex items-center gap-1">
        {isMarketplace && (
          <BadgeCheck2Fill className="size-3.5 shrink-0 text-blue-500" />
        )}
        {labeledWithTooltip}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isMarketplace && (
        <BadgeCheck2Fill className="size-4 shrink-0 text-blue-500" />
      )}
      {labeledWithTooltip}
    </div>
  );
}
