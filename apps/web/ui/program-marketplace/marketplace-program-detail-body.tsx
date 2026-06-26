import { NetworkProgramExtendedProps } from "@/lib/types";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramEligibilityCard } from "@/ui/partners/program-eligibility-card";

export function MarketplaceProgramDetailBody({
  program,
  showEligibilityCard = false,
}: {
  program: NetworkProgramExtendedProps;
  showEligibilityCard?: boolean;
}) {
  return (
    <>
      <LanderHero
        program={program}
        landerData={program.landerData || {}}
        showLabel={false}
        className="mt-8 sm:mt-8"
        heading="h2"
        titleClassName="text-2xl"
      />

      <LanderRewards
        className="mt-4"
        rewards={program.rewards || []}
        discount={program.discount || null}
        bounties={program.bounties}
      />

      {showEligibilityCard && program.applicationRequirements?.length ? (
        <ProgramEligibilityCard
          programSlug={program.slug}
          requirements={program.applicationRequirements}
        />
      ) : null}

      {program.landerData ? (
        <div className="mt-16 grid grid-cols-1 gap-10">
          {program.landerData.blocks.map((block, idx) => {
            const Component = BLOCK_COMPONENTS[block.type];
            return Component ? (
              <Component
                key={idx}
                block={block}
                group={{ logo: program.logo }}
              />
            ) : null;
          })}
        </div>
      ) : null}
    </>
  );
}
