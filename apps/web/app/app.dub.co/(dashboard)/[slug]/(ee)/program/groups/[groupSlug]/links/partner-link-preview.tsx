import { getLinkStructureOptions } from "@/lib/partners/get-link-structure-options";
import { PartnerLinkStructure } from "@dub/prisma/client";
import { LinkLogo } from "@dub/ui";
import { ArrowTurnRight2 } from "@dub/ui/icons";
import { cn, getApexDomain, getPrettyUrl } from "@dub/utils";
import { useMemo } from "react";

export function PartnerLinkPreview({
  url,
  domain,
  linkStructure,
  className,
}: {
  url: string;
  domain: string;
  linkStructure: PartnerLinkStructure;
  className?: string;
}) {
  const linkStructureOptions = getLinkStructureOptions({
    domain,
    url,
  });

  const shortLinkPreview = useMemo(() => {
    const selectedOption = linkStructureOptions.find(
      (option) => option.id === linkStructure,
    );

    return selectedOption?.example || `${domain}/partner`;
  }, [linkStructureOptions, linkStructure, domain]);

  return (
    <div
      className={cn(
        "border-border-subtle group relative flex items-center gap-3 rounded-xl border bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm",
        className,
      )}
    >
      <div className="relative flex shrink-0 items-center">
        <div className="absolute inset-0 h-8 w-8 rounded-full border border-neutral-200 sm:h-10 sm:w-10">
          <div className="h-full w-full rounded-full border border-white bg-gradient-to-t from-neutral-100" />
        </div>
        <div className="relative z-10 p-2">
          {url ? (
            <LinkLogo
              apexDomain={getApexDomain(url)}
              className="size-4 sm:size-6"
              imageProps={{
                loading: "lazy",
              }}
            />
          ) : (
            <div className="size-4 rounded-full bg-neutral-200 sm:size-6" />
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="truncate text-sm font-medium text-neutral-700">
          {shortLinkPreview}
        </div>

        <div className="flex min-h-[20px] items-center gap-1 text-sm text-neutral-500">
          {url ? (
            <>
              <ArrowTurnRight2 className="h-3 w-3 shrink-0 text-neutral-400" />
              <span className="truncate">{getPrettyUrl(url)}</span>
            </>
          ) : (
            <div className="h-3 w-1/2 rounded-md bg-neutral-200" />
          )}
        </div>
      </div>
    </div>
  );
}
