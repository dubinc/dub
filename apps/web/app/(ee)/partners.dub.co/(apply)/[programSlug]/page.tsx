import { getProgram } from "@/lib/fetchers/get-program";
import { getProgramApplicationRewardsAndDiscount } from "@/lib/partners/get-program-application-rewards";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";
import { ApplyButton } from "./apply-button";
import { Header } from "./header";

export default async function ApplyPage({
  params: { programSlug },
}: {
  params: { programSlug: string };
}) {
  const program = await getProgram({
    slug: programSlug,
    include: ["allRewards", "allDiscounts"],
  });

  if (!program || !program.landerData || !program.landerPublishedAt) {
    notFound();
  }

  const landerData = programLanderSchema.parse(program.landerData);

  const { rewards, discount } =
    getProgramApplicationRewardsAndDiscount(program);

  return (
    <div
      className="relative"
      style={
        {
          "--brand": program.brandColor || "#000000",
          "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
        } as CSSProperties
      }
    >
      <Header program={program} />
      <div className="p-6">
        <LanderHero program={program} landerData={landerData} />

        {/* Program details grid */}
        <LanderRewards className="mt-4" rewards={rewards} discount={discount} />

        {/* Buttons */}
        <div className="animate-scale-in-fade mt-10 flex flex-col gap-2 [animation-delay:400ms] [animation-fill-mode:both]">
          <ApplyButton programSlug={programSlug} />
          {/* <Button type="button" variant="secondary" text="Learn more" /> */}
        </div>

        {/* Content blocks */}
        <div className="mt-16 grid grid-cols-1 gap-10">
          {landerData.blocks.map((block, idx) => {
            const Component = BLOCK_COMPONENTS[block.type];
            return Component ? (
              <Component key={idx} block={block} program={program} />
            ) : null;
          })}
        </div>
      </div>
    </div>
  );
}
