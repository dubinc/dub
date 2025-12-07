import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { PageContent } from "@/ui/layout/page-content";
import { PageWidthWrapper } from "@/ui/layout/page-width-wrapper";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramCategory } from "@/ui/partners/program-network/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-network/program-rewards-display";
import { ChevronRight, Shop, Tooltip } from "@dub/ui";
import { OG_AVATAR_URL, cn } from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProgramStatusBadge } from "../program-status-badge";
import { MarketplaceProgramHeaderControls } from "./header-controls";

export const revalidate = 3600; // 1 hour

export default async function MarketplaceProgramPage(props: {
  params: Promise<{ programSlug: string }>;
}) {
  const params = await props.params;
  const { programSlug } = params;

  const program = await getNetworkProgram({
    slug: programSlug,
  });

  if (!program) {
    redirect("/programs/marketplace");
  }

  const isDarkImage = program.marketplaceHeaderImage?.includes("dark");

  return (
    <PageContent
      title={
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1">
            <Link
              href="/programs/marketplace"
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <Shop className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
          </div>

          <div className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 truncate text-lg font-semibold leading-7 text-neutral-900">
              Program details
            </span>
            <ProgramStatusBadge program={program} />
          </div>
        </div>
      }
      controls={<MarketplaceProgramHeaderControls program={program} />}
    >
      <PageWidthWrapper>
        <div className="relative">
          {program.featuredOnMarketplaceAt &&
            program.marketplaceHeaderImage && (
              <img
                src={program.marketplaceHeaderImage}
                alt={program.name}
                className="border-border-subtle absolute inset-0 size-full overflow-hidden rounded-xl border object-cover"
              />
            )}
          <div className="relative mx-auto max-w-screen-md py-8">
            <div className="flex items-start justify-between gap-4">
              {program ? (
                <img
                  src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                  alt={program.name}
                  className="size-16 rounded-full border border-white/20"
                />
              ) : (
                <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
              )}
            </div>

            <div className="mt-6 flex flex-col">
              <span
                className={cn(
                  "text-3xl font-semibold",
                  isDarkImage && "text-content-inverted",
                )}
              >
                {program.name}
              </span>

              <div
                className={cn(
                  "mt-2 flex max-w-md items-center gap-1",
                  isDarkImage && "text-content-inverted/90",
                )}
              >
                {program.name} is a program in the Dub Partner Network. Join the
                network to start partnering with them.
              </div>
            </div>

            <div className="mt-6 flex gap-8">
              {Boolean(program.rewards?.length || program.discount) && (
                <div>
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      isDarkImage && "text-content-inverted/70",
                    )}
                  >
                    Rewards
                  </span>
                  <ProgramRewardsDisplay
                    rewards={program.rewards}
                    discount={program.discount}
                    isDarkImage={isDarkImage}
                    className="mt-1"
                    descriptionClassName="max-w-[240px]"
                  />
                </div>
              )}
              {Boolean(program.categories?.length) && (
                <div className="min-w-0">
                  <span
                    className={cn(
                      "block text-xs font-medium",
                      isDarkImage && "text-content-inverted/70",
                    )}
                  >
                    Category
                  </span>
                  <div className="mt-1 flex items-center gap-1.5">
                    {program.categories
                      .slice(0, 1)
                      ?.map((category) => (
                        <ProgramCategory
                          key={category}
                          category={category}
                          className={cn(isDarkImage && "text-content-inverted")}
                        />
                      ))}
                    {program.categories.length > 1 && (
                      <Tooltip
                        content={
                          <div className="flex flex-col gap-0.5 p-2">
                            {program.categories.slice(1).map((category) => (
                              <ProgramCategory
                                key={category}
                                category={category}
                                className={cn(
                                  isDarkImage && "text-content-inverted",
                                )}
                              />
                            ))}
                          </div>
                        }
                      >
                        <div
                          className={cn(
                            "-ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium",
                            isDarkImage && "text-content-inverted/70",
                          )}
                        >
                          +{program.categories.length - 1}
                        </div>
                      </Tooltip>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-screen-md">
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
          />

          {program.landerData && (
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
          )}
        </div>
      </PageWidthWrapper>
    </PageContent>
  );
}
