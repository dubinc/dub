import { getMarketplaceAllHref } from "@/ui/partners/program-marketplace/get-marketplace-href";
import { ChevronLeft } from "@dub/ui";
import Link from "next/link";

export function MarketplaceProgramBackLink() {
  return (
    <Link
      href={getMarketplaceAllHref()}
      className="group inline-flex items-center gap-1 text-xs font-medium text-neutral-800 transition-colors hover:text-neutral-500"
    >
      <ChevronLeft className="size-[10px] text-neutral-500 transition-transform group-hover:-translate-x-0.5" />
      All Programs
    </Link>
  );
}
