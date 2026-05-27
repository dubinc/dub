import { NetworkProgramProps } from "@/lib/types";
import { MarketplaceProgramCard } from "../program-card";

export function MarketplaceExternalProgramGrid({
  programs,
}: {
  programs: NetworkProgramProps[];
}) {
  if (programs.length === 0) {
    return (
      <div className="text-content-subtle py-12 text-sm">
        No programs match these filters.
      </div>
    );
  }

  return (
    <div className="@4xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 lg:gap-6">
      {programs.map((program) => (
        <MarketplaceProgramCard
          key={program.id}
          program={program}
          showStatus={false}
        />
      ))}
    </div>
  );
}
