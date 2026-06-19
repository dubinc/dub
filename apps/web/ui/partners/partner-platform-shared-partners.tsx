import { PartnerSharedPlatformProps } from "@/lib/types";
import { Duplicate } from "@dub/ui/icons";
import { cn, pluralize } from "@dub/utils";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { PartnerAvatar } from "./partner-avatar";

export function PartnerPlatformSharedPartners({
  sharedPartners,
}: {
  sharedPartners: PartnerSharedPlatformProps["partners"];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const panelId = useId();

  return (
    <div className="border-subtle mx-2 rounded-b-lg border border-t-0 bg-white px-3">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex h-9 w-full items-center justify-between gap-2"
      >
        <div className="flex min-w-0 items-center gap-2">
          <Duplicate className="size-3.5 shrink-0 text-neutral-500" />
          <span className="truncate text-xs font-medium text-neutral-600">
            Added by {sharedPartners.length} other{" "}
            {pluralize("partner", sharedPartners.length)}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-neutral-400 transition-transform duration-200",
            isExpanded && "rotate-180",
          )}
        />
      </button>

      {isExpanded && (
        <div id={panelId} className="flex flex-col gap-2.5 pb-3 pt-1">
          {sharedPartners.map((partner) => (
            <SharedPartner key={partner.id} partner={partner} />
          ))}
        </div>
      )}
    </div>
  );
}

function SharedPartner({
  partner,
}: {
  partner: PartnerSharedPlatformProps["partners"][number];
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <PartnerAvatar partner={partner} className="size-3.5" />
        <span className="min-w-0 truncate text-xs font-medium text-neutral-700">
          {partner.name}
        </span>
      </div>
      <a
        href={`/partners/network?partnerId=${partner.id}&search=${encodeURIComponent(partner.email ?? "")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-content-subtle hover:text-content-default shrink-0 text-xs font-medium"
      >
        View
      </a>
    </div>
  );
}
