"use client";

import { Link } from "@dub/prisma/client";
import { getApexDomain, GOOGLE_FAVICON_URL } from "@dub/utils";

export function BrandLogoBadge({
  link,
  appName,
}: {
  link: Pick<Link, "shortLink" | "url">;
  appName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-lg">
        <img
          src={`${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`}
          alt={`${appName} logo`}
          className="size-8 shrink-0 overflow-visible rounded-full p-px"
        />
      </div>
      <div className="pr-1.5 text-lg font-semibold text-neutral-900">
        {appName}
      </div>
    </div>
  );
}
