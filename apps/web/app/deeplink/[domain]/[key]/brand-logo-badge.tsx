"use client";

import { EdgeLinkProps } from "@/lib/planetscale";
import { useCopyToClipboard } from "@dub/ui";
import { getApexDomain, GOOGLE_FAVICON_URL } from "@dub/utils";

export function BrandLogoBadge({ link }: { link: EdgeLinkProps }) {
  const [_copied, copyToClipboard] = useCopyToClipboard();

  return (
    <button
      onClick={() => {
        copyToClipboard(link.shortLink);
        window.location.href = link.shortLink;
      }}
      className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow-lg shadow-black/10 ring-1 ring-neutral-200"
    >
      <img
        src={`${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`}
        className="size-8 shrink-0 overflow-visible rounded-full p-px"
      />
      <div className="pr-1.5 text-lg font-semibold text-neutral-900">
        {getApexDomain(link.url)}
      </div>
    </button>
  );
}
