import { NetworkProgramProps } from "@/lib/types";
import {
  ProgramCategory,
  programCategorySurfaceClassName,
} from "@/ui/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/program-marketplace/program-rewards-display";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
  getMarketplaceProgramHref,
} from "@/ui/program-marketplace/utils/urls";
import { Tooltip } from "@dub/ui";
import { ArrowUpRight, Link4 } from "@dub/ui/icons";
import { OG_AVATAR_URL, getDomainWithoutWWW } from "@dub/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgramStatusBadge } from "./program-status-badge";
import { useImageAccentColor } from "./use-image-accent-color";

const FEATURED_CARD_BACKGROUNDS = [
  "#FFF1F2", // rose-50
  "#F0F9FF", // sky-50
  "#FFFBEB", // amber-50
  "#F5F3FF", // violet-50
  "#ECFDF5", // emerald-50
  "#FFF7ED", // orange-50
  "#FDF4FF", // fuchsia-50
  "#F0FDFA", // teal-50
  "#EEF2FF", // indigo-50
  "#F7FEE7", // lime-50
];

export function getFeaturedCardBackground(index: number) {
  return FEATURED_CARD_BACKGROUNDS[
    ((index % FEATURED_CARD_BACKGROUNDS.length) +
      FEATURED_CARD_BACKGROUNDS.length) %
      FEATURED_CARD_BACKGROUNDS.length
  ];
}

export function FeaturedProgramCard({
  program,
  showStatus = true,
  colorIndex = 0,
}: {
  program: NetworkProgramProps;
  showStatus?: boolean;
  colorIndex?: number;
}) {
  const router = useRouter();

  // Derive the tint from the program's image
  // Fall back to the palette if extraction is blocked
  const { color: accentColor, ready: accentReady } = useImageAccentColor(
    program.marketplaceHeaderImage ?? program.logo,
  );
  const backgroundColor = accentColor ?? getFeaturedCardBackground(colorIndex);

  return (
    <article className="relative flex h-full flex-col-reverse gap-4 overflow-hidden rounded-2xl p-2 sm:min-h-[340px] sm:flex-row">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-500 ease-out"
        style={{ backgroundColor, opacity: accentReady ? 1 : 0 }}
      />

      <Link
        href={getMarketplaceProgramHref(program.slug)}
        className="absolute inset-0 z-10 rounded-2xl"
        aria-label={`View ${program.name}`}
      />

      <div className="pointer-events-none relative z-20 flex min-w-0 flex-1 flex-col p-6">
        <div className="-mt-16 flex justify-between gap-4 sm:mt-0">
          <img
            src={program.logo || `${OG_AVATAR_URL}${program.name}`}
            alt={program.name}
            className="size-12 rounded-full border-4 border-neutral-100 sm:border sm:border-black/5"
          />

          {showStatus ? <ProgramStatusBadge program={program} /> : null}
        </div>

        <div className="flex flex-col pt-4 sm:mt-auto sm:pt-10">
          <span className="text-content-emphasis text-2xl font-semibold">
            {program.name}
          </span>

          <div className="text-content-default mt-1 line-clamp-2 max-w-sm text-sm">
            {program.description ||
              `${program.name} is a program in the Dub Partner Network. Join the network to start partnering with them.`}
          </div>

          <div className="pointer-events-auto relative z-30 mt-5 flex flex-wrap gap-x-8 gap-y-4">
            {Boolean(program.rewards?.length) && (
              <div>
                <span className="block text-xs font-medium text-neutral-400">
                  Rewards
                </span>
                <ProgramRewardsDisplay
                  iconsOnly
                  rewards={program.rewards}
                  onRewardClick={(reward) =>
                    router.push(
                      getMarketplaceAllHref({ rewardType: reward.event }),
                    )
                  }
                  className="mt-2 min-h-6"
                  iconClassName="text-neutral-900"
                />
              </div>
            )}
            {Boolean(program.categories.length) && (
              <div className="min-w-0">
                <span className="block text-xs font-medium text-neutral-400">
                  Category
                </span>
                <div className="mt-2 flex min-h-6 items-center gap-1.5">
                  {program.categories
                    .slice(0, 1)
                    ?.map((category) => (
                      <ProgramCategory
                        key={category}
                        category={category}
                        variant="surface"
                        onClick={() =>
                          router.push(getMarketplaceCategoryHref(category))
                        }
                      />
                    ))}
                  {program.categories.length > 1 && (
                    <Tooltip
                      content={
                        <div className="flex flex-col gap-1 p-1">
                          {program.categories.slice(1).map((category) => (
                            <ProgramCategory
                              key={category}
                              category={category}
                              variant="surface"
                              onClick={() =>
                                router.push(
                                  getMarketplaceCategoryHref(category),
                                )
                              }
                            />
                          ))}
                        </div>
                      }
                    >
                      <div className={programCategorySurfaceClassName}>
                        +{program.categories.length - 1}
                      </div>
                    </Tooltip>
                  )}
                </div>
              </div>
            )}
            {program.url && (
              <div className="basis-full sm:basis-auto">
                <span className="block text-xs font-medium text-neutral-400">
                  Website
                </span>
                <button
                  type="button"
                  aria-label={`Visit ${getDomainWithoutWWW(program.url)}`}
                  onClick={() => {
                    window.open(
                      program.url as string,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  className="mt-2 flex max-w-[220px] items-center gap-1 text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-600"
                >
                  <Link4 className="size-4 shrink-0" />
                  <span className="truncate">
                    {getDomainWithoutWWW(program.url)}
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {program.marketplaceHeaderImage && (
        <div className="pointer-events-none relative z-10 h-44 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-[55%] sm:self-stretch">
          <img
            src={program.marketplaceHeaderImage}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      )}
    </article>
  );
}

export function FeaturedProgramCardSkeleton() {
  return (
    <div className="relative h-full min-h-[340px] overflow-hidden rounded-2xl bg-neutral-100 p-2">
      <div className="relative flex h-full flex-col p-6">
        <div className="flex justify-between gap-4">
          <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
        </div>

        <div className="mt-auto flex flex-col pt-10">
          <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />

          <div className="mt-1 max-w-sm">
            <div className="h-5 w-64 animate-pulse rounded bg-neutral-200" />
          </div>

          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
            <div>
              <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 flex gap-1.5">
                <div className="size-4 animate-pulse rounded bg-neutral-200" />
                <div className="size-4 animate-pulse rounded bg-neutral-200" />
              </div>
            </div>
            <div>
              <div className="h-4 w-14 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 h-5 w-24 animate-pulse rounded-full bg-neutral-200" />
            </div>
            <div className="basis-full sm:basis-auto">
              <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 h-5 w-28 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
