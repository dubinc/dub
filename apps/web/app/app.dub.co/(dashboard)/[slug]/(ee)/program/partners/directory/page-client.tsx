"use client";

import { ONLINE_PRESENCE_FIELDS } from "@/lib/partners/online-presence";
import {
  industryInterestsMap,
  salesChannelsMap,
} from "@/lib/partners/partner-profile";
import useWorkspace from "@/lib/swr/use-workspace";
import { DiscoverablePartnerProps } from "@/lib/types";
import {
  PARTNER_CONVERSION_SCORES,
  PARTNER_CONVERSION_SCORE_RATES,
} from "@/lib/zod/schemas/partner-discovery";
import { ConversionScoreIcon } from "@/ui/partners/conversion-score-icon";
import {
  BadgeCheck2Fill,
  ChartActivity2,
  DynamicTooltipWrapper,
  Tooltip,
  UserPlus,
  useResizeObserver,
  useRouterStuff,
} from "@dub/ui";
import type { Icon } from "@dub/ui/icons";
import {
  COUNTRIES,
  OG_AVATAR_URL,
  capitalize,
  cn,
  fetcher,
  formatDate,
  timeAgo,
} from "@dub/utils";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";

export function ProgramPartnersDirectoryPageClient() {
  const { id: workspaceId } = useWorkspace();
  const { searchParams, queryParams } = useRouterStuff();

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
  ];

  const currentTabId =
    tabs.find(({ id }) => id === searchParams.get("tab"))?.id || "discover";

  const { data: partners, error } = useSWR<DiscoverablePartnerProps[]>(
    workspaceId &&
      `/api/network/partners?${new URLSearchParams({
        workspaceId,
        page: "1",
        ...(currentTabId !== "discover" && { status: currentTabId }),
      })}`,
    fetcher,
  );

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 gap-2">
        {tabs.map((tab) => {
          const isActive = currentTabId === tab.id;

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
                });
              }}
            >
              <span className="text-content-default text-xs font-semibold">
                {tab.label}
              </span>
              <span className="text-content-emphasis text-base font-semibold">
                N,NNN
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="text-content-subtle py-12 text-sm">
          Failed to load partners
        </div>
      ) : !partners || partners?.length ? (
        <div className="@5xl/page:grid-cols-4 @3xl/page:grid-cols-3 @xl/page:grid-cols-2 grid grid-cols-1 gap-4 lg:gap-6">
          {partners
            ? partners?.map((partner) => (
                <PartnerCard key={partner.id} partner={partner} />
              ))
            : [...Array(8)].map((_, idx) => <PartnerCard key={idx} />)}
        </div>
      ) : (
        <div className="text-content-subtle py-12 text-sm">
          No partners found
        </div>
      )}
    </div>
  );
}

function PartnerCard({ partner }: { partner?: DiscoverablePartnerProps }) {
  const basicFields = useMemo(
    () => [
      {
        id: "listedAt",
        icon: <UserPlus className="size-3.5 shrink-0" />,
        text: partner
          ? partner.discoverableAt
            ? `Listed ${formatDate(partner.discoverableAt)}`
            : null
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
      },
    ],
    [partner],
  );

  const onlinePresenceData = useMemo(
    () =>
      partner
        ? ONLINE_PRESENCE_FIELDS.map((field) => ({
            label: field.label,
            icon: field.icon,
            ...field.data(partner),
          })).filter((field) => field.value && field.href)
        : null,
    [partner],
  );

  return (
    <div className="border-border-subtle rounded-xl border p-4">
      <div className="flex justify-between gap-4">
        {/* Avatar + country icon */}
        <div className="relative w-fit">
          {partner ? (
            <img
              src={partner.image || `${OG_AVATAR_URL}${partner.name}`}
              alt={partner.name}
              className="size-16 rounded-full"
            />
          ) : (
            <div className="size-16 animate-pulse rounded-full bg-neutral-200" />
          )}
          {partner?.country && (
            <Tooltip content={COUNTRIES[partner.country]}>
              <div className="absolute -right-1 top-1 overflow-hidden rounded-full bg-white p-0.5 transition-transform duration-100 hover:scale-[1.15]">
                <img
                  alt=""
                  src={`https://flag.vercel.app/m/${partner.country}.svg`}
                  className="size-3.5 rounded-full"
                />
              </div>
            </Tooltip>
          )}
        </div>
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
            .map(({ id, icon, text }) => (
              <DynamicTooltipWrapper
                key={id}
                tooltipProps={
                  id === "conversion"
                    ? {
                        content: (
                          <div className="max-w-60 p-2.5 text-xs">
                            <div className="flex flex-col gap-2.5">
                              {PARTNER_CONVERSION_SCORES.map((score, idx) => (
                                <div
                                  key={score}
                                  className="flex items-center gap-1.5"
                                >
                                  <ConversionScoreIcon
                                    score={score}
                                    className="size-3.5 shrink-0"
                                  />
                                  <span className="text-content-default font-semibold">
                                    {capitalize(score)}{" "}
                                    <span className="text-content-subtle font-medium">
                                      (
                                      {idx <
                                      PARTNER_CONVERSION_SCORES.length - 1 ? (
                                        <>
                                          {PARTNER_CONVERSION_SCORE_RATES[
                                            score
                                          ] * 100}
                                          -
                                          {PARTNER_CONVERSION_SCORE_RATES[
                                            PARTNER_CONVERSION_SCORES[idx + 1]
                                          ] * 100}
                                        </>
                                      ) : (
                                        <>
                                          &gt;
                                          {PARTNER_CONVERSION_SCORE_RATES[
                                            score
                                          ] * 100}
                                        </>
                                      )}
                                      %)
                                    </span>
                                  </span>
                                </div>
                              ))}
                            </div>
                            <p className="text-content-subtle mt-4 font-medium">
                              This score is an average for all Dub programs the
                              partner is enrolled in.
                            </p>
                          </div>
                        ),
                        side: "right",
                        align: "end",
                      }
                    : undefined
                }
              >
                <div className="text-content-subtle flex cursor-default items-center gap-1">
                  {text !== undefined ? (
                    <>
                      {icon}
                      <span className="text-xs font-medium">{text}</span>
                    </>
                  ) : (
                    <div className="h-4 w-24 animate-pulse rounded bg-neutral-200" />
                  )}
                </div>
              </DynamicTooltipWrapper>
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
                <div key={idx} className="size-6 rounded-full bg-neutral-100" />
              ))}
        </div>
      </div>

      {/* Partner profile selections */}
      <div className="mt-5 flex flex-col gap-5">
        {/* Industry interests */}
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Industry interests
          </h3>
          <ListRow
            className={cn(!partner && "animate-pulse")}
            items={partner?.industryInterests
              ?.map((interest) => industryInterestsMap[interest])
              .filter(
                (item): item is { icon: Icon; label: string } =>
                  item !== undefined,
              )}
          />
        </div>

        {/* Sales channels */}
        <div className="flex flex-col gap-2">
          <h3 className="text-content-emphasis text-xs font-semibold">
            Sales channels
          </h3>
          <ListRow
            className={cn(!partner && "animate-pulse")}
            items={partner?.salesChannels
              ?.map((salesChannel) => salesChannelsMap[salesChannel])
              .filter((item): item is { label: string } => item !== undefined)}
          />
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
        {items?.length ? (
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
