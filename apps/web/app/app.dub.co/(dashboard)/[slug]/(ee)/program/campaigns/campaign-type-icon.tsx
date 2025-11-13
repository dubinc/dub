import { cn } from "@dub/utils";
import { CAMPAIGN_TYPE_BADGES } from "./campaign-type-badges";

export function CampaignTypeIcon({
  type,
  className,
  iconClassName,
}: {
  type: keyof typeof CAMPAIGN_TYPE_BADGES;
  className?: string;
  iconClassName?: string;
}) {
  const { icon: Icon, iconClassName: typeIconClassName } =
    CAMPAIGN_TYPE_BADGES[type];

  return (
    <div
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        typeIconClassName,
        className,
      )}
    >
      <Icon className={cn("size-3.5", iconClassName)} />
    </div>
  );
}
