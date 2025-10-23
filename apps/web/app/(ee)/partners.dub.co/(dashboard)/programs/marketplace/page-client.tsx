"use client";

import { categoriesMap } from "@/lib/partners/categories";
import useNetworkProgramsCount from "@/lib/swr/use-network-programs-count";
import { NetworkProgramProps } from "@/lib/types";
import { PROGRAM_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/program-network";
import { REWARD_EVENTS } from "@/ui/partners/constants";
import { formatDiscountDescription } from "@/ui/partners/format-discount-description";
import { formatRewardDescription } from "@/ui/partners/format-reward-description";
import { ProgramNetworkStatusBadges } from "@/ui/partners/partner-status-badges";
import { SearchBoxPersisted } from "@/ui/shared/search-box";
import { Category } from "@dub/prisma/client";
import {
  AnimatedSizeContainer,
  CircleInfo,
  Filter,
  Gift,
  Icon,
  Link4,
  PaginationControls,
  StatusBadge,
  Tooltip,
  usePagination,
  useRouterStuff,
} from "@dub/ui";
import {
  OG_AVATAR_URL,
  cn,
  fetcher,
  getPrettyUrl,
  isClickOnInteractiveChild,
} from "@dub/utils";
import * as HoverCard from "@radix-ui/react-hover-card";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { MarketplaceEmptyState } from "./marketplace-empty-state";
import ProgramSort from "./program-sort";
import { useProgramNetworkFilters } from "./use-program-network-filters";

export function ProgramMarketplacePageClient() {
  const { getQueryString } = useRouterStuff();

  const { data: programsCount, error: countError } = useNetworkProgramsCount();

  const {
    data: programs,
    error,
    isValidating,
  } = useSWR<NetworkProgramProps[]>(
    `/api/network/programs${getQueryString({
      //
    })}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { pagination, setPagination } = usePagination(
    PROGRAM_NETWORK_MAX_PAGE_SIZE,
  );

  const {
    filters,
    activeFilters,
    isFiltered,
    onSelect,
    onRemove,
    onRemoveAll,
  } = useProgramNetworkFilters();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="xs:flex-row xs:items-center flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter.Select
              className="h-9 w-full rounded-lg md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
            <ProgramSort />
          </div>
          <SearchBoxPersisted
            placeholder="Search the marketplace..."
            inputClassName="md:w-[19rem] h-9 rounded-lg"
          />
        </div>
        <AnimatedSizeContainer height>
          <div>
            <div className={cn("pt-3", !isFiltered && "hidden")}>
              <Filter.List
                filters={filters}
                activeFilters={activeFilters}
                onSelect={onSelect}
                onRemove={onRemove}
                onRemoveAll={onRemoveAll}
              />
            </div>
          </div>
        </AnimatedSizeContainer>
      </div>

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load programs
        </div>
      ) : !programs || programs?.length ? (
        <div>
          <div
            className={cn(
              "@4xl/page:grid-cols-3 @xl/page:grid-cols-2 grid min-h-[500px] grid-cols-1 items-start gap-4 transition-opacity lg:gap-6",
              isValidating && "opacity-50",
            )}
          >
            {programs
              ? programs?.map((program) => (
                  <ProgramCard key={program.id} program={program} />
                ))
              : [...Array(5)].map((_, idx) => <ProgramCard key={idx} />)}
          </div>
          <div className="sticky bottom-0 mt-4 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={programsCount || 0}
              unit={(p) => `program${p ? "s" : ""}`}
            />
          </div>
        </div>
      ) : (
        <MarketplaceEmptyState
          isFiltered={isFiltered}
          onClearAllFilters={onRemoveAll}
        />
      )}
    </div>
  );
}

function ProgramCard({ program }: { program?: NetworkProgramProps }) {
  const router = useRouter();

  const statusBadge = program?.status
    ? ProgramNetworkStatusBadges[program.status]
    : null;
  const url = program ? `/programs/${program.slug}` : undefined;

  return (
    <div
      className={cn(program?.id && "cursor-pointer hover:drop-shadow-sm")}
      onClick={
        url
          ? (e) => {
              if (isClickOnInteractiveChild(e)) return;
              e.metaKey || e.ctrlKey
                ? window.open(url, "_blank")
                : router.push(url);
            }
          : undefined
      }
      onAuxClick={
        url
          ? (e) => {
              if (isClickOnInteractiveChild(e)) return;
              window.open(url, "_blank");
            }
          : undefined
      }
    >
      <div className="border-border-subtle rounded-xl border bg-white p-6">
        <div className="flex justify-between gap-4">
          {program ? (
            <img
              src={program.logo || `${OG_AVATAR_URL}${program.name}`}
              alt={program.name}
              className="size-12 rounded-full"
            />
          ) : (
            <div className="size-12 animate-pulse rounded-full bg-neutral-200" />
          )}

          {/* TODO: Status */}
          {statusBadge && (
            <StatusBadge {...statusBadge} className="px-1.5 py-0.5">
              {statusBadge.label}
            </StatusBadge>
          )}
        </div>

        <div className="mt-4 flex flex-col">
          {/* Name */}
          {program ? (
            <span className="text-content-emphasis text-base font-semibold">
              {program.name}
            </span>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
          )}

          <div className="text-content-default mt-1 flex items-center gap-1">
            <Link4 className="size-3.5" />
            {/* Domain */}
            {program ? (
              <a
                href={program.url || `https://${program.domain}`}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm font-medium"
              >
                {getPrettyUrl(program.url) || program.domain}
              </a>
            ) : (
              <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
            )}
          </div>

          <div className="mt-4 flex gap-8">
            {program ? (
              <>
                {Boolean(program?.rewards?.length || program?.discount) && (
                  <div>
                    <span className="text-content-muted block text-xs font-medium">
                      Rewards
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.rewards?.map((reward) => (
                        <RewardOrDiscountIcon
                          key={reward.id}
                          icon={REWARD_EVENTS[reward.event].icon}
                          description={formatRewardDescription({ reward })}
                        />
                      ))}
                      {program.discount && (
                        <RewardOrDiscountIcon
                          icon={Gift}
                          description={formatDiscountDescription({
                            discount: program.discount,
                          })}
                        />
                      )}
                    </div>
                  </div>
                )}
                {Boolean(program?.categories?.length) && (
                  <div className="min-w-0">
                    <span className="text-content-muted block text-xs font-medium">
                      Industry
                    </span>
                    <div className="mt-1 flex items-center gap-1.5">
                      {program.categories
                        .slice(0, 1)
                        ?.map((category) => (
                          <CategoryButton key={category} category={category} />
                        ))}
                      {program.categories.length > 1 && (
                        <Tooltip
                          content={
                            <div className="flex flex-col gap-0.5 p-2">
                              {program.categories.slice(1).map((category) => (
                                <CategoryButton
                                  key={category}
                                  category={category}
                                />
                              ))}
                            </div>
                          }
                        >
                          <div className="text-content-subtle -ml-1.5 flex size-6 items-center justify-center rounded-md text-xs font-medium">
                            +{program.categories.length - 1}
                          </div>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div>
                <div className="h-3.5 w-12 animate-pulse rounded bg-neutral-200" />
                <div className="mt-1 h-6 w-24 animate-pulse rounded bg-neutral-200" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const RewardOrDiscountIcon = ({
  icon: Icon,
  description,
}: {
  icon: Icon;
  description: string;
}) => (
  <HoverCard.Root openDelay={100}>
    <HoverCard.Portal>
      <HoverCard.Content
        side="bottom"
        sideOffset={8}
        className="animate-slide-up-fade z-[99] flex items-center gap-2 overflow-hidden rounded-xl border border-neutral-200 bg-white p-2 text-xs text-neutral-700 shadow-sm"
      >
        <Icon className="text-content-default size-4" />
        <span>{description}</span>
      </HoverCard.Content>
    </HoverCard.Portal>
    <HoverCard.Trigger>
      <button
        type="button"
        className="hover:bg-bg-subtle active:bg-bg-emphasis flex size-6 items-center justify-center rounded-md"
      >
        <Icon className="text-content-default size-4" />
      </button>
    </HoverCard.Trigger>
  </HoverCard.Root>
);

const CategoryButton = ({ category }: { category: Category }) => {
  const categoryData = categoriesMap[category];
  const { icon: Icon, label } = categoryData ?? {
    icon: CircleInfo,
    label: category.replace("_", " "),
  };

  return (
    <button
      key={category}
      type="button"
      className="hover:bg-bg-subtle text-content-default active:bg-bg-emphasis flex h-6 min-w-0 items-center gap-1 rounded-md px-1"
    >
      <Icon className="size-4" />
      <span className="min-w-0 truncate text-sm font-medium">{label}</span>
    </button>
  );
};
