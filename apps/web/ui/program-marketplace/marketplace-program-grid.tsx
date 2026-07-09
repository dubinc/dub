import { NetworkProgramProps } from "@/lib/types";
import { cn } from "@dub/utils";
import {
  MarketplaceProgramCard,
  MarketplaceProgramCardSkeleton,
} from "./program-card";

export function MarketplaceProgramGrid({
  programs,
  showStatus = true,
  className,
}: {
  programs: NetworkProgramProps[];
  showStatus?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@4xl/page:grid-cols-3 @xl/page:grid-cols-2",
        "grid gap-4 lg:gap-6",
        className,
      )}
    >
      {programs.map((program) => (
        <MarketplaceProgramCard
          key={program.id}
          program={program}
          showStatus={showStatus}
        />
      ))}
    </div>
  );
}

export function MarketplaceProgramGridSkeleton({
  count = 5,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "@4xl/page:grid-cols-3 @xl/page:grid-cols-2",
        "grid gap-4 lg:gap-6",
        className,
      )}
    >
      {[...Array(count)].map((_, idx) => (
        <MarketplaceProgramCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function MarketplaceProgramGridEmpty({
  message = "No programs match these filters.",
}: {
  message?: string;
}) {
  return <div className="text-content-subtle py-12 text-sm">{message}</div>;
}
