import { getMarketplaceAllHref } from "@/ui/partners/program-marketplace/get-marketplace-all-href";
import { ProgramMarketplaceLogos } from "@/ui/partners/program-marketplace/program-marketplace-logos";
import Link from "next/link";

export function MarketplaceViewAllCard({
  href = getMarketplaceAllHref(),
}: {
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="border-border-subtle hover:drop-shadow-card-hover flex h-full min-h-[220px] flex-col justify-between rounded-xl border bg-white p-6 transition-[filter]"
    >
      <div className="h-24 w-full">
        <ProgramMarketplaceLogos />
      </div>
      <span className="text-content-emphasis text-base font-semibold">
        View all
      </span>
    </Link>
  );
}
