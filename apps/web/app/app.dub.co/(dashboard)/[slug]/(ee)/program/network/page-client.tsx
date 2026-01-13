"use client";

import { updateDiscoveredPartnerAction } from "@/lib/actions/partners/update-discovered-partner";
import { PARTNER_PLATFORM_FIELDS } from "@/lib/partners/partner-platforms";
import useNetworkPartnersCount from "@/lib/swr/use-network-partners-count";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PARTNER_NETWORK_MAX_PAGE_SIZE } from "@/lib/zod/schemas/partner-network";
import { ConversionScoreIcon } from "@/ui/partners/conversion-score-icon";
import { ConversionScoreTooltip } from "@/ui/partners/partner-network/conversion-score-tooltip";
import { NetworkPartnerSheet } from "@/ui/partners/partner-network/network-partner-sheet";
import { PartnerStarButton } from "@/ui/partners/partner-star-button";
import { TrustedPartnerBadge } from "@/ui/partners/trusted-partner-badge";
import {
  AnimatedSizeContainer,
  BadgeCheck2Fill,
  ChartActivity2,
  Filter,
  PaginationControls,
  Switch,
  Tooltip,
  UserPlus,
  usePagination,
  useResizeObserver,
  useRouterStuff,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import { EnvelopeArrowRight, Globe } from "@dub/ui/icons";
import {
  COUNTRIES,
  OG_AVATAR_URL,
  capitalize,
  cn,
  fetcher,
  formatDate,
  isClickOnInteractiveChild,
  timeAgo,
} from "@dub/utils";
import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { NetworkEmptyState } from "./network-empty-state";
import { usePartnerNetworkFilters } from "./use-partner-network-filters";

const tabs = [
  {
    label: "Discover",
    id: "discover",
  },
  {
    label: "Invited",
    id: "invited",
  },
  {
    label: "Recruited",
    id: "recruited",
  },
] as const;

export function ProgramPartnerNetworkPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, getQueryString, queryParams } = useRouterStuff();

  const status =
    tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";

  const { data: partnerCounts, error: countError } = useNetworkPartnersCount();

  const {
    data: partners,
    error,
    mutate: mutatePartners,
    isValidating,
  } = useSWR<NetworkPartnerProps[]>(
    workspaceId &&
      `/api/network/partners${getQueryString(
        {
          workspaceId,
          status,
        },
        {
          exclude: ["tab", "partnerId"],
        },
      )}`,
    fetcher,
    { revalidateOnFocus: false, keepPreviousData: true },
  );

  const { executeAsync: updateDiscoveredPartner } = useAction(
    updateDiscoveredPartnerAction,
  );

  const { pagination, setPagination } = usePagination(
    PARTNER_NETWORK_MAX_PAGE_SIZE,
  );

  const { filters, activeFilters, onSelect, onRemove, onRemoveAll } =
    usePartnerNetworkFilters({ status });

  const [detailsSheetState, setDetailsSheetState] = useState<
    | { open: false; partnerId: string | null }
    | { open: true; partnerId: string }
  >({ open: false, partnerId: null });

  useEffect(() => {
    const partnerId = searchParams.get("partnerId");
    if (partnerId) setDetailsSheetState({ open: true, partnerId });
  }, [searchParams]);

  const { currentPartner } = useCurrentPartner({
    partners,
    partnerId: detailsSheetState.partnerId,
  });

  const [previousPartnerId, nextPartnerId] = useMemo(() => {
    if (!partners || !detailsSheetState.partnerId) return [null, null];

    const currentIndex = partners.findIndex(
      ({ id }) => id === detailsSheetState.partnerId,
    );
    if (currentIndex === -1) return [null, null];

    return [
      currentIndex > 0 ? partners[currentIndex - 1].id : null,
      currentIndex < partners.length - 1 ? partners[currentIndex + 1].id : null,
    ];
  }, [partners, detailsSheetState.partnerId]);

  return (
    <div className="flex flex-col gap-6">
      {detailsSheetState.partnerId && currentPartner && (
        <NetworkPartnerSheet
          isOpen={detailsSheetState.open}
          setIsOpen={(open) =>
            setDetailsSheetState((s) => ({ ...s, open }) as any)
          }
          partner={currentPartner}
          onPrevious={
            previousPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: previousPartnerId },
                    scroll: false,
                  })
              : undefined
          }
          onNext={
            nextPartnerId
              ? () =>
                  queryParams({
                    set: { partnerId: nextPartnerId },
                    scroll: false,
                  })
              : undefined
          }
        />
      )}
      <div className="grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const isActive = status === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              className={cn(
                "border-border-subtle flex flex-col gap-1 rounded-lg border p-4 text-left transition-colors duration-100",
                isActive
                  ? "border-black ring-1 ring-black"
                  : "hover:bg-bg-muted",
              )}
              onClick={() => {
                queryParams({
                  set: { tab: tab.id },
                  del: ["page", "starred"],
                });
              }}
            >
              <span className="text-content-default text-xs font-semibold">
                {tab.label}
              </span>
              {partnerCounts ? (
                <span className="text-content-emphasis text-base font-semibold">
                  {(partnerCounts?.[tab.id] || 0).toLocaleString()}
                </span>
              ) : (
                <div className="h-6 w-12 animate-pulse rounded-md bg-neutral-200" />
              )}
            </button>
          );
        })}
      </div>

      <div>
        <div className="xs:flex-row xs:items-center flex flex-col gap-4">
          <Filter.Select
            className="h-9 w-full rounded-lg md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          {status === "discover" && (
            <label className="flex items-center gap-2">
              <Switch
                checked={searchParams.get("starred") == "true"}
                fn={(checked) => {
                  queryParams({
                    set: checked ? { starred: "true" } : undefined,
                    del: ["page", ...(!checked ? ["starred"] : [])],
                  });
                }}
              />
              <span className="text-content-emphasis text-sm font-medium">
                Starred
              </span>
            </label>
          )}
        </div>
        <AnimatedSizeContainer height>
          <div>
            {activeFilters.length > 0 && (
              <div className="pt-3">
                <Filter.List
                  filters={filters}
                  activeFilters={activeFilters}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onRemoveAll={onRemoveAll}
                />
              </div>
            )}
          </div>
        </AnimatedSizeContainer>
      </div>

      {error || countError ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load partners
        </div>
      ) : !partners || partners?.length ? (
        <div>
          <div
            className={cn(
              "@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 transition-opacity lg:gap-6",
              isValidating && "opacity-50",
            )}
          >
            {partners
              ? partners?.map((partner) => (
                  <PartnerCard
                    key={partner.id}
                    partner={partner}
                    onToggleStarred={(starred) => {
                      mutatePartners(
                        // @ts-ignore SWR doesn't seem to have proper typing for partial data results w/ `populateCache`
                        async () => {
                          const result = await updateDiscoveredPartner({
                            workspaceId: workspaceId!,
                            partnerId: partner.id,
                            starred,
                          });
                          if (!result?.data) {
                            toast.error("Failed to star partner");
                            throw new Error("Failed to star partner");
                          }

                          return result.data;
                        },
                        {
                          optimisticData: (data) =>
                            (data || partners).map((p) =>
                              p.id === partner.id
                                ? {
                                    ...p,
                                    starredAt: starred ? new Date() : null,
                                  }
                                : p,
                            ),
                          populateCache: (
                            result: { starredAt: Date | null },
                            data,
                          ) =>
                            (data || partners).map((p) =>
                              p.id === partner.id
                                ? { ...p, starredAt: result.starredAt }
                                : p,
                            ),
                          revalidate: false,
                        },
                      );
                    }}
                  />
                ))
              : [...Array(12)].map((_, idx) => <PartnerCard key={idx} />)}
          </div>
          <div className="sticky bottom-0 mt-4 rounded-b-[inherit] border-t border-neutral-200 bg-white px-3.5 py-2">
            <PaginationControls
              pagination={pagination}
              setPagination={setPagination}
              totalCount={partnerCounts?.[status]}
              unit={(p) => `partner${p ? "s" : ""}`}
            />
          </div>
        </div>
      ) : (
        <NetworkEmptyState
          isFiltered={activeFilters.length > 0}
          isStarred={searchParams.get("starred") == "true"}
          onClearAllFilters={onRemoveAll}
        />
      )}
    </div>
  );
}

function PartnerCard({
  partner,
  onToggleStarred,
}: {
  partner?: NetworkPartnerProps;
  onToggleStarred?: (starred: boolean) => void;
}) {
  const { slug: workspaceSlug } = useWorkspace();
  const { queryParams } = useRouterStuff();

  const basicFields = useMemo(
    () => [
      {
        id: "country",
        icon: partner?.country ? (
          <img
            alt={`Flag of ${COUNTRIES[partner.country]}`}
            src={`https://flag.vercel.app/m/${partner.country}.svg`}
            className="size-3.5 rounded-full"
          />
        ) : (
          <Globe className="size-3.5 shrink-0" />
        ),
        text: partner
          ? partner.country
            ? COUNTRIES[partner.country]
            : "Planet Earth"
          : undefined,
      },
      {
        id: "joinedAt",
        icon: <UserPlus className="size-3.5 shrink-0" />,
        text: partner
          ? `Joined ${formatDate(partner.createdAt, { month: "short" })}`
          : undefined,
      },
      {
        id: "lastConversion",
        icon: <ChartActivity2 className="size-3.5 shrink-0" />,
        text: partner
          ? partner.lastConversionAt
            ? `Last conversion ${timeAgo(partner.lastConversionAt, { withAgo: true })}`
            : "No conversions yet"
          : undefined,
      },
      {
        id: "conversion",
        icon: (
          <ConversionScoreIcon
            score={partner?.conversionScore || null}
            className="size-3.5 shrink-0"
          />
        ),
        text: partner
          ? partner.conversionScore
            ? `${capitalize(partner.conversionScore)} conversion`
            : "Unknown conversion"
          : undefined,
        wrapper: ConversionScoreTooltip,
      },
    ],
    [partner],
  );

  const onlinePresenceData = useMemo(
    () =>
      partner
        ? PARTNER_PLATFORM_FIELDS.map((field) => ({
            label: field.label,
            icon: field.icon,
            ...field.data(partner.platforms),
          })).filter((field) => field.value && field.href)
        : null,
    [partner],
  );

  const categoriesData = useMemo(
    () =>
      partner
        ? partner.categories.map((category) => ({
            label: category.replace(/_/g, " "),
          }))
        : undefined,
    [partner],
  );

  return (
    <div
      className={cn(
        partner?.id &&
          "hover:drop-shadow-card-hover cursor-pointer transition-[filter]",
      )}
      onClick={(e) => {
        if (!partner?.id || isClickOnInteractiveChild(e)) return;
        if (partner.recruitedAt || partner.invitedAt) {
          window.open(
            `/${workspaceSlug}/program/partners/${partner.id}`,
            "_blank",
          );
        } else {
          queryParams({ set: { partnerId: partner.id } });
        }
      }}
    >
      {(partner?.invitedAt || partner?.recruitedAt) && (
        <div className="bg-bg-subtle border-border-subtle -mb-3 flex items-center justify-center gap-2 rounded-t-xl border-x border-t p-2 pb-5">
          {partner.recruitedAt ? (
            <UserPlus className="text-content-default size-4 shrink-0" />
          ) : (
            <EnvelopeArrowRight className="text-content-default size-4 shrink-0" />
          )}

          <span className="text-content-emphasis text-sm font-medium">
            {partner.recruitedAt
              ? `Recruited ${timeAgo(partner.recruitedAt, { withAgo: true })}`
              : `Sent ${timeAgo(partner.invitedAt, { withAgo: true })}`}
          </span>
        </div>
      )}
      <div className="border-border-subtle rounded-xl border bg-white p-4">
        <div className="flex justify-between gap-4">
          {/* Avatar + country icon */}
          <div className="relative w-fit">
            {partner ? (
              <img
                src={partner.image || `${OG_AVATAR_URL}${partner.id}`}
                alt={partner.id}
                className="size-16 rounded-full border border-neutral-100"
              />
            ) : (
              <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
            )}
            {partner?.trustedAt && <TrustedPartnerBadge />}
          </div>

          {partner && onToggleStarred && (
            <PartnerStarButton
              partner={partner}
              onToggleStarred={onToggleStarred}
              className="size-6"
              iconSize="size-3"
            />
          )}
        </div>

        <div className="mt-3.5 flex flex-col gap-3">
          {/* Name */}
          {partner ? (
            <span className="text-content-emphasis text-base font-semibold">
              {partner.name}
            </span>
          ) : (
            <div className="h-6 w-32 animate-pulse rounded bg-neutral-200" />
          )}

          {/* Basic details */}
          <div className="flex flex-col items-start gap-1">
            {basicFields
              .filter(({ text }) => text !== null)
              .map(({ id, icon, text, wrapper: Wrapper = "div" }) => (
                <Wrapper key={id}>
                  <div className="text-content-subtle flex cursor-default items-center gap-2">
                    {text !== undefined ? (
                      <>
                        {icon}
                        <span className="text-xs font-medium">{text}</span>
                      </>
                    ) : (
                      <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                    )}
                  </div>
                </Wrapper>
              ))}
          </div>

          {/* Online presence */}
          <div
            className={cn(
              "flex flex-wrap items-center gap-1.5",
              !partner && "animate-pulse",
            )}
          >
            {onlinePresenceData?.length
              ? onlinePresenceData.map(
                  ({ label, icon: Icon, verified, value, href }) => (
                    <Tooltip
                      key={label}
                      content={
                        <Link
                          href={href ?? "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-content-default hover:text-content-emphasis flex items-center gap-1 px-2 py-1 text-xs font-medium"
                        >
                          <Icon className="size-3 shrink-0" />
                          <span>{value}</span>
                          {verified && (
                            <BadgeCheck2Fill className="size-3 text-green-600" />
                          )}
                        </Link>
                      }
                    >
                      <Link
                        key={label}
                        href={href ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-border-subtle hover:bg-bg-muted relative flex size-6 shrink-0 items-center justify-center rounded-full border"
                      >
                        <Icon className="size-3" />
                        <span className="sr-only">{label}</span>

                        {verified && (
                          <BadgeCheck2Fill className="absolute -right-1 -top-1 size-3 text-green-600" />
                        )}
                      </Link>
                    </Tooltip>
                  ),
                )
              : [...Array(3)].map((_, idx) => (
                  <div
                    key={idx}
                    className="size-6 rounded-full bg-neutral-100"
                  />
                ))}
          </div>

          {/* Categories */}
          <ListRow items={categoriesData} />
        </div>
      </div>
    </div>
  );
}

function ListRow({
  items,
  className,
}: {
  items?: { icon?: Icon; label: string }[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [isReady, setIsReady] = useState(false);

  const [shownItems, setShownItems] = useState<
    { icon?: Icon; label: string }[] | undefined
  >(items);

  useEffect(() => {
    if (isReady) return;

    setIsReady(false);
    setShownItems(items);
  }, [items, isReady]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Determine if we need to show less items
    if (
      shownItems?.length &&
      containerRef.current.scrollWidth > containerRef.current.clientWidth
    ) {
      setIsReady(false);
      setShownItems(shownItems?.slice(0, -1));
    } else {
      setIsReady(true);
    }
  }, [shownItems]);

  // Show less items if needed after resizing
  const entry = useResizeObserver(containerRef);
  useEffect(() => {
    if (!containerRef.current) return;

    if (containerRef.current.scrollWidth > containerRef.current.clientWidth)
      setIsReady(false);
  }, [entry]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "overflow-hidden",
        items?.length && !isReady && "opacity-0",
      )}
    >
      <div className={cn("flex gap-1", className)}>
        {items ? (
          items.length ? (
            <>
              {shownItems?.map(({ icon, label }) => (
                <ListPill key={label} icon={icon} label={label} />
              ))}
              {(shownItems?.length ?? 0) < items.length && (
                <Tooltip
                  content={
                    <div className="flex max-w-sm flex-wrap gap-1 p-2">
                      {items
                        .filter(
                          ({ label }) =>
                            !shownItems?.some(
                              ({ label: shownLabel }) => shownLabel === label,
                            ),
                        )
                        .map(({ icon, label }) => (
                          <ListPill key={label} icon={icon} label={label} />
                        ))}
                    </div>
                  }
                >
                  <div className="text-content-default flex h-7 select-none items-center rounded-full bg-neutral-100 px-2 text-xs font-medium hover:bg-neutral-200">
                    +{items.length - (shownItems?.length ?? 0)}
                  </div>
                </Tooltip>
              )}
            </>
          ) : (
            <div className="flex h-7 w-fit items-center rounded-full border border-dashed border-neutral-300 bg-neutral-50 px-2">
              <span className="text-content-subtle text-xs opacity-60">
                Not specified
              </span>
            </div>
          )
        ) : (
          [...Array(2)].map((_, idx) => (
            <div key={idx} className="h-7 w-20 rounded-full bg-neutral-100" />
          ))
        )}
      </div>
    </div>
  );
}

function ListPill({ icon: Icon, label }: { icon?: Icon; label: string }) {
  return (
    <div className="flex h-7 items-center gap-1.5 rounded-full bg-neutral-100 px-2">
      {Icon && <Icon className="text-content-emphasis size-3 shrink-0" />}
      <span className="text-content-default whitespace-nowrap text-xs font-medium">
        {label}
      </span>
    </div>
  );
}

/** Gets the current partner from the loaded partners array if available, or a separate fetch if not */
function useCurrentPartner({
  partners,
  partnerId,
}: {
  partners?: NetworkPartnerProps[];
  partnerId: string | null;
}) {
  const { id: workspaceId } = useWorkspace();

  let currentPartner = partnerId
    ? partners?.find(({ id }) => id === partnerId)
    : null;

  const fetchPartnerId =
    partners && partnerId && !currentPartner ? partnerId : null;

  const { data: fetchedPartners, isLoading } = useSWR<NetworkPartnerProps>(
    fetchPartnerId &&
      `/api/network/partners?workspaceId=${workspaceId}&partnerIds=${fetchPartnerId}`,
    fetcher,
    {
      keepPreviousData: true,
    },
  );

  if (!currentPartner && fetchedPartners?.[0]?.id === partnerId)
    currentPartner = fetchedPartners[0];

  return { currentPartner, isLoading };
}
