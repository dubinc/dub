"use client";

import { getApexDomain, GOOGLE_FAVICON_URL } from "@dub/utils";
import { Link } from "@prisma/client";

export function BrandLogoBadge({
  link,
  appName,
}: {
  link: Pick<Link, "shortLink" | "url">;
  appName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="flex size-20 items-center justify-center rounded-3xl bg-white shadow-[0px_1px_3px_0px_#0000000F,_0px_4px_14px_0px_#00000014]">
        <img
          src={`${GOOGLE_FAVICON_URL}${getApexDomain(link.url)}`}
          alt={`${appName} logo`}
          className="size-10 shrink-0 overflow-visible rounded-full"
        />
      </div>
      <h1 className="text-xl font-semibold text-neutral-900">{appName}</h1>
    </div>
  );
}
