import { getMarketplaceHref } from "@/ui/partners/program-marketplace/get-marketplace-href";
import { ChevronRight, Shop } from "@dub/ui";
import Link from "next/link";
import { ReactNode } from "react";

export function MarketplacePageTitle({
  title,
  trailing,
}: {
  title: string;
  trailing?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        <Link
          href={getMarketplaceHref()}
          className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
        >
          <Shop className="text-content-default size-4" />
        </Link>
        <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
          {title}
        </span>
        {trailing}
      </div>
    </div>
  );
}
