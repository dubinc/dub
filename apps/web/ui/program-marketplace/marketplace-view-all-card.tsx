import { ProgramMarketplaceLogosCluster } from "@/ui/program-marketplace/program-marketplace-logos";
import { getMarketplaceAllHref } from "@/ui/program-marketplace/utils/urls";
import { Grid } from "@dub/ui";
import { cn } from "@dub/utils";
import Link from "next/link";
import type { CSSProperties } from "react";

const VIEW_ALL_GRID_MASK =
  "radial-gradient(ellipse 85% 70% at 50% 44%, white 10%, rgba(255,255,255,0.2) 60%, transparent 62%)";

export function MarketplaceViewAllCard({
  href = getMarketplaceAllHref(),
  className,
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "border-border-subtle hover:drop-shadow-card-hover group relative flex h-full min-h-[220px] flex-col overflow-hidden rounded-xl border bg-white transition-[filter]",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-100 [-webkit-mask-image:var(--view-all-grid-mask)] [mask-image:var(--view-all-grid-mask)]"
        style={
          {
            "--view-all-grid-mask": VIEW_ALL_GRID_MASK,
          } as CSSProperties
        }
      >
        <Grid
          cellSize={36}
          strokeWidth={1}
          className="size-full text-[#ECECEC]"
        />
      </div>

      <div className="relative flex flex-1 items-center justify-center px-6 pt-8">
        <ProgramMarketplaceLogosCluster />
      </div>

      <span className="relative pb-6 text-center text-base font-semibold text-neutral-600">
        View all
      </span>
    </Link>
  );
}
