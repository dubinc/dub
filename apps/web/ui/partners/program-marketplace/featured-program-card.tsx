import { NetworkProgramProps } from "@/lib/types";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
  getMarketplaceProgramHref,
} from "@/ui/partners/program-marketplace/get-marketplace-href";
import { ProgramCategory } from "@/ui/partners/program-marketplace/program-category";
import { ProgramRewardsDisplay } from "@/ui/partners/program-marketplace/program-rewards-display";
import { Tooltip } from "@dub/ui";
import { OG_AVATAR_URL } from "@dub/utils";
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

  // Derive the tint from the program's image; fall back to the palette if
  // extraction is blocked (CORS / no image).
  const { color: accentColor, ready: accentReady } = useImageAccentColor(
    program.marketplaceHeaderImage ?? program.logo,
  );
  const backgroundColor = accentColor ?? getFeaturedCardBackground(colorIndex);

  return (
    <Link
      href={getMarketplaceProgramHref(program.slug)}
      className="relative flex h-full flex-col-reverse gap-4 overflow-hidden rounded-2xl p-2 sm:min-h-[340px] sm:flex-row"
    >
      {/* Color layer: the final tint fades in once, with no intermediate
          (placeholder) color, so there's no hue flicker. Cached images are
          marked ready immediately, so they appear instantly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out"
        style={{ backgroundColor, opacity: accentReady ? 1 : 0 }}
      />

      {/* Content (z-20 so the overlapping logo sits above the image on mobile) */}
      <div className="relative z-20 flex min-w-0 flex-1 flex-col p-6">
        {/* On mobile the logo overlaps the bottom-left of the stacked image */}
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

          <div className="mt-5 flex gap-8">
            {Boolean(program.rewards?.length || program.discount) && (
              <div>
                <span className="text-content-subtle block text-xs font-medium">
                  Rewards
                </span>
                <ProgramRewardsDisplay
                  rewards={program.rewards}
                  discount={program.discount}
                  onRewardClick={(reward) =>
                    router.push(
                      getMarketplaceAllHref({ rewardType: reward.event }),
                    )
                  }
                  onDiscountClick={() =>
                    router.push(
                      getMarketplaceAllHref({ rewardType: "discount" }),
                    )
                  }
                  className="hover:bg-bg-default/10 active:bg-bg-default/20 mt-2"
                  iconClassName="hover:bg-bg-default/10 active:bg-bg-default/20"
                  descriptionClassName="max-w-[240px]"
                />
              </div>
            )}
            {Boolean(program.categories.length) && (
              <div className="min-w-0">
                <span className="text-content-subtle block text-xs font-medium">
                  Category
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  {program.categories
                    .slice(0, 1)
                    ?.map((category) => (
                      <ProgramCategory
                        key={category}
                        category={category}
                        onClick={() =>
                          router.push(getMarketplaceCategoryHref(category))
                        }
                        className="hover:bg-bg-default/10 active:bg-bg-default/20"
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
                      <div className="-ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium">
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

      {/* Banner: stacked on top (mobile) / inset panel on the right (desktop) */}
      {program.marketplaceHeaderImage && (
        <div className="relative z-10 h-44 w-full shrink-0 overflow-hidden rounded-xl sm:h-auto sm:w-[55%] sm:self-stretch">
          <img
            src={program.marketplaceHeaderImage}
            alt={program.name}
            className="absolute inset-0 size-full object-cover"
          />
        </div>
      )}
    </Link>
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
          {/* Name - text-3xl font-semibold is typically ~36px height */}
          <div className="h-9 w-40 animate-pulse rounded bg-neutral-200" />

          {/* Description - text-sm single line, ~20px height */}
          <div className="mt-1 max-w-sm">
            <div className="h-5 w-64 animate-pulse rounded bg-neutral-200" />
          </div>

          {/* Rewards/Category section - matches actual card structure with mt-5 */}
          <div className="mt-5 flex gap-8">
            <div>
              <div className="h-4 w-12 animate-pulse rounded bg-neutral-200" />
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-neutral-200" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
