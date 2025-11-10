import { cn } from "@dub/utils";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";

export function CampaignTypeIcon({
  type,
  className,
}: {
  type: keyof typeof CAMPAIGN_TYPE_BADGES;
  className?: string;
}) {
  const { icon: Icon, iconClassName } = CAMPAIGN_TYPE_BADGES[type];

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        iconClassName,
        className,
      )}
    >
      <Icon className="size-3.5" />
    </div>
  );
}
