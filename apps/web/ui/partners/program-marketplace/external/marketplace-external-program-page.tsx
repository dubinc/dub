import { getNetworkProgram } from "@/lib/fetchers/get-network-program";
import { ApplicationAnalytics } from "@/ui/application-analytics";
import { BLOCK_COMPONENTS } from "@/ui/partners/lander/blocks";
import { LanderHero } from "@/ui/partners/lander/lander-hero";
import { LanderRewards } from "@/ui/partners/lander/lander-rewards";
import { ProgramEligibilityCard } from "@/ui/partners/program-eligibility-card";
import {
  getMarketplaceHref,
  getMarketplaceProgramHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { ProgramCategory } from "@/ui/partners/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-marketplace/program-rewards-display";
import { Button, ChevronRight, Shop, Tooltip } from "@dub/ui";
import { Globe } from "@dub/ui/icons";
import {
  OG_AVATAR_URL,
  PARTNERS_DOMAIN,
  cn,
  getDomainWithoutWWW,
} from "@dub/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarketplaceExternalShell } from "./marketplace-external-shell";

export async function MarketplaceExternalProgramPage({
  programSlug,
}: {
  programSlug: string;
}) {
  const program = await getNetworkProgram({
    slug: programSlug,
  });

  if (!program) {
    redirect(getMarketplaceHref());
  }

  const isDarkImage = program.marketplaceHeaderImage?.includes("dark");
  const applyHref = `${PARTNERS_DOMAIN}${getMarketplaceProgramHref(program.slug)}`;

  return (
    <>
      <ApplicationAnalytics />
      <MarketplaceExternalShell variant="none">
        <div className="mx-auto max-w-screen-md">
          <div className="mb-6 flex items-center gap-1.5">
            <Link
              href={getMarketplaceHref()}
              className="bg-bg-subtle hover:bg-bg-emphasis flex size-8 shrink-0 items-center justify-center rounded-lg transition-[transform,background-color] duration-150 active:scale-95"
            >
              <Shop className="text-content-default size-4" />
            </Link>
            <ChevronRight className="text-content-subtle size-2.5 shrink-0 [&_*]:stroke-2" />
            <span className="text-content-emphasis text-lg font-semibold">
              {program.name}
            </span>
          </div>

          <div className="mb-6 flex justify-end">
            <Link href={applyHref}>
              <Button text="Apply on Dub Partners" className="h-9 rounded-lg" />
            </Link>
          </div>

          <div
            className={cn(
              "relative",
              program.featuredOnMarketplaceAt &&
                "border-border-subtle overflow-hidden rounded-xl border",
            )}
          >
            {program.featuredOnMarketplaceAt &&
              program.marketplaceHeaderImage && (
                <>
                  <img
                    src={program.marketplaceHeaderImage}
                    alt={program.name}
                    className="absolute inset-0 size-full object-cover"
                  />
                  {!isDarkImage && (
                    <div className="absolute inset-0 size-full bg-gradient-to-t from-white via-white/75 to-transparent" />
                  )}
                </>
              )}
            <div className="relative px-4 py-8 sm:px-0">
              <img
                src={program.logo || `${OG_AVATAR_URL}${program.name}`}
                alt={program.name}
                className="size-16 rounded-full border border-white/20"
              />

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
                  {program.description ||
                    `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
                </div>
              </div>

              <div className="mt-6 flex gap-8">
                {Boolean(program.rewards?.length || program.discount) && (
                  <div>
                    <span
                      className={cn(
                        "block text-xs font-medium",
                        isDarkImage
                          ? "text-content-inverted"
                          : "text-neutral-400",
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
                        isDarkImage
                          ? "text-content-inverted"
                          : "text-neutral-400",
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
                            className={cn(
                              isDarkImage && "text-content-inverted",
                            )}
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
                {program.url && (
                  <div className="min-w-0">
                    <span className="block text-xs font-medium text-neutral-400">
                      Website
                    </span>
                    <Link
                      href={program.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "mt-1 flex max-w-[220px] items-center gap-1.5 text-sm font-medium",
                        isDarkImage
                          ? "text-content-inverted/90 hover:text-content-inverted"
                          : "text-content-default hover:text-content-emphasis",
                      )}
                    >
                      <Globe className="size-4 shrink-0" />
                      <span className="truncate">
                        {getDomainWithoutWWW(program.url)} ↗
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

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

          {program.applicationRequirements?.length ? (
            <ProgramEligibilityCard
              requirements={program.applicationRequirements}
            />
          ) : null}

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
      </MarketplaceExternalShell>
    </>
  );
}
