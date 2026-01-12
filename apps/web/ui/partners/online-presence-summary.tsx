import { ONLINE_PRESENCE_FIELDS } from "@/lib/partners/online-presence";
import { PartnerPlatformProps } from "@/lib/types";
import { cn } from "@dub/utils";
import { Fragment } from "react";
import { OnlinePresenceCard } from "./online-presence-card";

export function OnlinePresenceSummary({
  platforms,
  showLabels = true,
  className,
  emptyClassName,
}: {
  platforms: PartnerPlatformProps[] | undefined;
  showLabels?: boolean;
  className?: string;
  emptyClassName?: string;
}) {
  if (!platforms || platforms.length === 0) {
    return (
      <div
        className={cn(
          "text-sm italic text-neutral-400",
          className,
          emptyClassName,
        )}
      >
        No online presence provided
      </div>
    );
  }

  const fieldData = ONLINE_PRESENCE_FIELDS.map((field) => ({
    label: field.label,
    icon: field.icon,
    ...field.data(platforms),
  })).filter((field) => field.value && field.href);

  return (
    <div
      className={cn(
        "grid items-center gap-x-4 gap-y-5 text-sm md:gap-x-16",
        showLabels ? "grid-cols-[max-content_minmax(0,1fr)]" : "grid-cols-1",
        className,
      )}
    >
      {fieldData.map(({ label, icon: Icon, value, verified, href, info }) => {
        return (
          <Fragment key={label}>
            {showLabels && (
              <span className="text-content-default font-medium">{label}</span>
            )}
            <div>
              <OnlinePresenceCard
                icon={Icon}
                value={value ?? ""}
                verified={verified}
                info={info}
                href={href ?? undefined}
              />
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
