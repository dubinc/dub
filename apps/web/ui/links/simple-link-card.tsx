import { LinkProps } from "@/lib/types";
import { ArrowTurnRight2, LinkLogo } from "@dub/ui";
import { getApexDomain, getPrettyUrl } from "@dub/utils";
import { cn } from "@dub/utils/src";

export function SimpleLinkCard({
  link,
  className,
}: {
  link: Pick<LinkProps, "shortLink" | "url">;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3.5",
        className,
      )}
    >
      <div className="relative flex-none rounded-full border border-neutral-200 bg-gradient-to-t from-neutral-100 sm:p-1.5">
        <LinkLogo
          apexDomain={getApexDomain(link.url)}
          className="size-4 shrink-0 sm:size-5"
        />
      </div>
      <div className="flex min-w-0 flex-col text-sm leading-tight">
        <span className="truncate text-sm font-semibold text-neutral-800">
          {getPrettyUrl(link.shortLink)}
        </span>
        <div className="flex items-center gap-1">
          <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
          {link.url ? (
            <span title={link.url} className="truncate text-neutral-500">
              {getPrettyUrl(link.url)}
            </span>
          ) : (
            <span className="truncate text-neutral-400">No URL configured</span>
          )}
        </div>
      </div>
    </div>
  );
}
