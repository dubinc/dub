import { BadgeCheck2Fill, DynamicTooltipWrapper } from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { cn, timeAgo } from "@dub/utils";

export function PlatformStatCard({
  label,
  icon: PlatformIcon,
  verified,
  stat,
  value,
  info,
  verifiedAt,
  href,
}: {
  label: string;
  icon: Icon;
  verified: boolean;
  stat?: string | null;
  value?: string | null;
  info?: string[];
  verifiedAt?: Date | null;
  href?: string | null;
}) {
  const content = (
    <div
      className={cn(
        "bg-bg-subtle flex flex-col items-center gap-1 rounded-lg p-1 pt-2",
        href && "hover:bg-bg-muted transition-colors",
      )}
    >
      <div className="relative">
        <PlatformIcon
          className={cn("size-3.5", !value && "text-content-subtle opacity-40")}
        />
        {verified && (
          <BadgeCheck2Fill className="absolute -right-1.5 -top-1.5 size-3 text-green-600" />
        )}
      </div>
      <span
        className={cn(
          "text-[9px] font-medium leading-none",
          verified && stat ? "text-content-default" : "text-content-subtle",
        )}
      >
        {verified && stat ? stat : "—"}
      </span>
      <span className="sr-only">{label}</span>
    </div>
  );

  const As = href ? "a" : "div";

  return (
    <DynamicTooltipWrapper
      tooltipProps={
        value
          ? {
              content: (
                <PlatformStatTooltipContent
                  icon={PlatformIcon}
                  value={value}
                  stat={stat}
                  info={info}
                  verifiedAt={verifiedAt}
                />
              ),
            }
          : undefined
      }
    >
      <As
        {...(href
          ? {
              href,
              target: "_blank",
              rel: "noopener noreferrer",
            }
          : {})}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </As>
    </DynamicTooltipWrapper>
  );
}

function PlatformStatTooltipContent({
  icon: PlatformIcon,
  value,
  stat,
  info,
  verifiedAt,
}: {
  icon: Icon;
  value?: string | null;
  stat?: string | null;
  info?: string[];
  verifiedAt?: Date | null;
}) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center gap-2 p-3 pb-1.5">
        <div className="border-border-subtle flex size-7 shrink-0 items-center justify-center rounded-full border">
          <PlatformIcon className="size-3.5" />
        </div>
        <div className="min-w-0">
          <div className="text-content-emphasis truncate font-semibold">
            {value}
          </div>
          {(info?.[0] ?? stat) && (
            <div className="text-content-default font-medium">
              {info?.[0] ?? stat}
            </div>
          )}
        </div>
      </div>
      <div className="text-content-subtle border-border-subtle flex items-center gap-1.5 border-t px-3 py-1.5 font-medium">
        {verifiedAt ? (
          <>
            <BadgeCheck2Fill className="size-3 shrink-0 text-green-600" />
            Verified {timeAgo(verifiedAt, { withAgo: true })}
          </>
        ) : (
          "Not verified"
        )}
      </div>
    </div>
  );
}
