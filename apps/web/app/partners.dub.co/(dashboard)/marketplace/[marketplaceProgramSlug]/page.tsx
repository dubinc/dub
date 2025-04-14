import { getProgram } from "@/lib/fetchers/get-program";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander-blocks";
import { ProgramRewardList } from "@/ui/partners/program-reward-list";
import { MaxWidthWrapper } from "@dub/ui";
import { cn } from "@dub/utils";
import { ApplyButton } from "app/partners.dub.co/(apply)/[programSlug]/apply-button";
import { notFound } from "next/navigation";
import { CSSProperties } from "react";

export default async function MarketplaceProgramPage({
  params: { marketplaceProgramSlug },
}: {
  params: { marketplaceProgramSlug: string };
}) {
  const program = await getProgram({
    slug: marketplaceProgramSlug,
    include: ["rewards", "defaultDiscount"],
  });

  if (!program) {
    notFound();
  }

  // TODO: reuse from /(apply)/[programSlug]/page.tsx
  return (
    <MaxWidthWrapper>
      <div
        className="relative"
        style={
          {
            "--brand": "#000000",
            "--brand-ring": "rgb(from var(--brand) r g b / 0.2)",
          } as CSSProperties
        }
      >
        <div className="p-6">
          {/* Hero section */}
          <div className="grid grid-cols-1 gap-5 sm:pt-20">
            <span
              className={cn(
                "font-mono text-xs font-medium uppercase text-[var(--brand)]",
                "animate-slide-up-fade [--offset:5px] [animation-duration:1s] [animation-fill-mode:both]",
              )}
            >
              Affiliate Program
            </span>
            <h1
              className={cn(
                "text-4xl font-semibold",
                "animate-slide-up-fade [--offset:5px] [animation-delay:100ms] [animation-duration:1s] [animation-fill-mode:both]",
              )}
            >
              Join the {program.name} affiliate program
            </h1>
            <p
              className={cn(
                "text-base text-neutral-700",
                "animate-slide-up-fade [--offset:5px] [animation-delay:200ms] [animation-duration:1s] [animation-fill-mode:both]",
              )}
            >
              Share {program.name} with your audience and for each subscription
              generated through your referral, you'll earn a share of the
              revenue on any plans they purchase.
            </p>
            {/* <p className="text-xs text-neutral-500">
              Read our{" "}
              <a
                href="#"
                className="underline transition-colors duration-100 hover:text-neutral-600"
              >
                Terms of Service
              </a>{" "}
              for more details.
            </p> */}
          </div>

          {/* Program details grid */}
          <div className="mt-10">
            <h2 className="mb-2 text-base font-semibold text-neutral-800">
              Rewards
            </h2>
            <ProgramRewardList
              rewards={program.rewards}
              discount={program.defaultDiscount}
              className="bg-neutral-100"
            />
          </div>

          {/* Buttons */}
          <div className="animate-scale-in-fade mt-10 flex flex-col gap-2 [animation-delay:400ms] [animation-fill-mode:both]">
            <ApplyButton programSlug={program.slug} />
          </div>
        </div>

        {/* Content blocks */}
        {program.landerData && (
          <div className="mt-16 grid grid-cols-1 gap-10">
            {programLanderSchema
              .parse(program.landerData)
              .blocks.map((block, idx) => {
                const Component = BLOCK_COMPONENTS[block.type];
                return Component ? (
                  <Component key={idx} block={block} logo={program.logo} />
                ) : null;
              })}
          </div>
        )}
      </div>
    </MaxWidthWrapper>
  );
}
