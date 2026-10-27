import { BadgeCheck2 } from "@dub/ui";
import { Icon } from "@dub/ui/icons";
import { timeAgo } from "@dub/utils";

export function PlatformStatTooltipContent({
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
  verifiedAt?: Date | string | null;
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
            <BadgeCheck2
              variant="fill"
              className="size-3 shrink-0 text-green-600"
            />
            Verified {timeAgo(new Date(verifiedAt), { withAgo: true })}
          </>
        ) : (
          "Not verified"
        )}
      </div>
    </div>
  );
}
