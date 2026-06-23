"use client";

import {
  PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER,
  PARTNER_CONTENT_SEARCH_LIMITS,
  PARTNER_CONTENT_SEARCH_TOP_CONTENT,
  type PartnerContentTopicFitBand,
} from "@/lib/partner-content-search/constants";
import {
  getBlendedTopContentScore,
  getViewBaseline,
} from "@/lib/partner-content-search/top-content-ranking";
import { mutatePrefix } from "@/lib/swr/mutate";
import usePartnerContentSearch, {
  type PartnerContentMatchEvidence,
  type PartnerContentSearchPartner,
} from "@/lib/swr/use-partner-content-search";
import useWorkspace from "@/lib/swr/use-workspace";
import { NetworkPartnerProps } from "@/lib/types";
import { PartnerAbout } from "@/ui/partners/partner-about";
import { PartnerComments } from "@/ui/partners/partner-comments";
import { PartnerInfoCards } from "@/ui/partners/partner-info-cards";
import { PartnerSheetTabs } from "@/ui/partners/partner-sheet-tabs";
import { Button, Tooltip } from "@dub/ui";
import { EnvelopeArrowRight, Instagram, TikTok, YouTube } from "@dub/ui/icons";
import { cn, fetcher, nFormatter } from "@dub/utils";
import { EmailContent } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-email-preview";
import { InviteNetworkPartnerSheet } from "app/app.dub.co/(dashboard)/[slug]/(ee)/program/partners/invite-network-partner-sheet";
import Link from "next/link";
import {
  BAND_LABELS,
  formatDuration,
  formatMatchPercent,
  formatPublishedDate,
  formatTimestamp,
  getContentHref,
  getContentThumbnail,
  getContentTitle,
} from "../content-display-utils";
import {
  getContentSearchPlatforms,
  parseSelectedPlatforms,
  platformFilterParam,
} from "../platform-filter-utils";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const DETAIL_CONTENT_INITIAL_MATCH_COUNT = 8;
const DETAIL_CONTENT_MATCH_INCREMENT = 8;

export function NetworkPartnerDetailPageClient({
  partnerId,
}: {
  partnerId: string;
}) {
  return (
    <NetworkPartnerDetailContent
      partnerId={partnerId}
      partnerStatus="discover"
      showBackLink
    />
  );
}

export function NetworkPartnerDetailContent({
  partnerId,
  partnerStatus,
  searchPartner: initialSearchPartner,
  showBackLink = false,
  nestedSheets = false,
}: {
  partnerId: string;
  partnerStatus: string;
  searchPartner?: PartnerContentSearchPartner;
  showBackLink?: boolean;
  nestedSheets?: boolean;
}) {
  const { id: workspaceId, slug: workspaceSlug } = useWorkspace();
  const [currentTabId, setCurrentTabId] = useState<string>("about");
  const searchParams = useSearchParams();
  const search = searchParams.get("search")?.trim() ?? "";
  const country = searchParams.get("country") ?? undefined;
  const selectedPlatforms = parseSelectedPlatforms(
    searchParams.get("platform"),
  );
  const contentSearchPlatforms = getContentSearchPlatforms(selectedPlatforms);
  const hasContentSearch =
    search.length > 0 && contentSearchPlatforms.length > 0;
  const backHref = workspaceSlug
    ? `/${workspaceSlug}/program/network${getBackQueryString(searchParams)}`
    : "#";

  const { data: partners, isLoading: isLoadingPartner } = useSWR<
    NetworkPartnerProps[]
  >(
    workspaceId
      ? getPartnerApiPath({ workspaceId, partnerStatus, partnerId, country })
      : null,
    fetcher,
    { revalidateOnFocus: false },
  );
  const loadedPartner = partners?.[0];

  // The results page already ran the global search and handed us this partner's
  // match data, so the detail opens instantly. In the background we run a scoped
  // single-partner rerank so the matched list shares ONE relevance scale — the
  // global search only reranks its top-N pool, mixing rerank + cosine otherwise.
  // Non-blocking: the cached Topic Fit headline paints now; rows skeleton until it lands.
  const shouldFetchSearch = hasContentSearch;
  const {
    data: searchResults,
    error: searchError,
    isLoading: isLoadingSearch,
  } = usePartnerContentSearch({
    enabled: Boolean(workspaceId && shouldFetchSearch),
    query: search,
    platforms: platformFilterParam(selectedPlatforms),
    country,
    starred: false,
    partnerIds: [partnerId],
    limit: 1,
    chunksPerPartner: PARTNER_CONTENT_SEARCH_DETAIL_CHUNKS_PER_PARTNER,
    candidateChunkCount: PARTNER_CONTENT_SEARCH_LIMITS.chunkCandidateCount,
  });

  const fetchedPartner = searchResults?.partners?.[0];
  const partner =
    loadedPartner ?? initialSearchPartner?.partner ?? fetchedPartner?.partner;
  // Chunks prefer the fuller fetched set; the summary keeps the cached one so scores don't drift.
  const searchPartner = fetchedPartner ?? initialSearchPartner;
  const searchSummary =
    initialSearchPartner?.matchSummary ?? fetchedPartner?.matchSummary;
  // Per-row relevance comes from the scoped reranked summary once it lands (one
  // scale); null until then, so rows show cached scores and quietly upgrade.
  const relevanceSummary = fetchedPartner?.matchSummary ?? null;
  // Deep-link with nothing cached → full skeleton; otherwise a silent refinement.
  const isFallbackLoading = isLoadingSearch && !initialSearchPartner;
  const isRefiningRelevance =
    isLoadingSearch && Boolean(initialSearchPartner) && !relevanceSummary;

  if (!isLoadingPartner && !partner) {
    return (
      <div className="flex flex-col gap-6">
        {showBackLink && (
          <Link
            href={backHref}
            className="text-content-default hover:text-content-emphasis flex w-fit items-center gap-2 text-sm font-medium transition-colors"
          >
            <ArrowLeft className="size-4" />
            Back to results
          </Link>
        )}
        <section className="border-border-subtle rounded-xl border bg-white p-8 text-sm text-neutral-600">
          Partner not found in the network results.
        </section>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {showBackLink && (
        <Link
          href={backHref}
          className="text-content-default hover:text-content-emphasis flex w-fit items-center gap-2 text-sm font-medium transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to results
        </Link>
      )}

      <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="lg:order-2">
          <PartnerInfoCards
            type="network"
            partner={partner}
            browseMode
            hideStatuses={["pending"]}
            showFraudIndicator={false}
            controls={
              partner ? (
                <NetworkInviteControl
                  partner={partner}
                  nested={nestedSheets}
                  onSuccess={() => mutatePrefix("/api/network/partners")}
                />
              ) : undefined
            }
          />
        </div>

        <div className="lg:order-1">
          <div className="border-border-subtle overflow-hidden rounded-xl border bg-neutral-100">
            <PartnerSheetTabs
              partnerId={partnerId}
              currentTabId={currentTabId}
              setCurrentTabId={setCurrentTabId}
              aboutLabel="Content matches"
            />
            <div className="border-border-subtle -mx-px -mb-px rounded-xl border bg-white p-4">
              {currentTabId === "about" && (
                <div className="grid grid-cols-1 gap-5 text-sm text-neutral-600">
                  <PartnerAbout
                    partner={partner}
                    hideSocials
                    hideDescription
                    hideMonthlyTraffic
                  />
                  {hasContentSearch && (
                    <SearchFitPanel
                      error={searchError}
                      isLoading={isFallbackLoading}
                      isRefining={isRefiningRelevance}
                      summary={searchSummary}
                      relevanceSummary={relevanceSummary}
                      searchPartner={searchPartner}
                    />
                  )}
                </div>
              )}
              {currentTabId === "comments" && (
                <div>
                  <h3 className="text-content-emphasis text-lg font-semibold">
                    Comments
                  </h3>
                  <PartnerComments partnerId={partnerId} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact "Invite" action rendered in the sidebar card header (next to the star).
function NetworkInviteControl({
  partner,
  nested,
  onSuccess,
}: {
  partner: NetworkPartnerProps;
  nested?: boolean;
  onSuccess: () => void;
}) {
  const [showInviteSheet, setShowInviteSheet] = useState(false);
  const [inviteEmailContent, setInviteEmailContent] =
    useState<EmailContent | null>(null);

  if (partner.invitedAt || partner.recruitedAt) return null;

  return (
    <>
      <InviteNetworkPartnerSheet
        nested={nested}
        isOpen={showInviteSheet}
        setIsOpen={setShowInviteSheet}
        partner={partner}
        emailContent={inviteEmailContent}
        onEmailContentChange={setInviteEmailContent}
        onSuccess={onSuccess}
      />
      <Button
        type="button"
        variant="primary"
        text="Invite"
        icon={<EnvelopeArrowRight className="size-4" />}
        onClick={() => setShowInviteSheet(true)}
        className="h-9 rounded-lg px-3"
      />
    </>
  );
}

const TOPIC_FIT_BAND_STYLES: Record<
  PartnerContentTopicFitBand,
  { number: string; chip: string }
> = {
  consistent: { number: "text-green-600", chip: "bg-green-50 text-green-700" },
  frequent: { number: "text-blue-600", chip: "bg-blue-50 text-blue-700" },
  occasional: { number: "text-amber-600", chip: "bg-amber-50 text-amber-700" },
  "one-off": {
    number: "text-neutral-500",
    chip: "bg-neutral-100 text-neutral-600",
  },
  none: { number: "text-neutral-400", chip: "bg-neutral-100 text-neutral-500" },
};

// Coarse "Nd / Nw / Nmo ago" for the last on-topic post.
function lastPostedLabel(iso: string | null) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days < 7) return `${days}d ago`;
  if (days < 8 * 7) return `${Math.floor(days / 7)}w ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

// Per-post match bars: height = match magnitude, color = platform. Muted, evenly-
// weighted palette so platforms read as a calm spectrum (none looks like a non-match).
const PLATFORM_BAR_COLORS: Record<string, string> = {
  youtube: "bg-[#bd8488]",
  instagram: "bg-[#b083a2]",
  tiktok: "bg-[#74a09a]",
  twitter: "bg-[#8589b3]",
  x: "bg-[#8589b3]",
  linkedin: "bg-[#7c9cbd]",
  website: "bg-[#bda77c]",
};

// Glanceable recent-activity strip, capped to the most-recent N so columns stay
// hoverable. Topic Fit + the "X of Y" counts still use the full server-side set.
const MAX_VISIBLE_CONTENT_BARS = 40;

function ContentMatchBars({
  summary,
}: {
  summary: PartnerContentSearchPartner["matchSummary"] | undefined;
}) {
  // One open tooltip at a time — driving every bar's open state from one value
  // prevents a fast cursor flick leaving several open.
  const [openBarId, setOpenBarId] = useState<string | null>(null);

  const allBars = summary?.contentBars ?? [];
  if (!allBars.length) return null;
  const bars = allBars.slice(0, MAX_VISIBLE_CONTENT_BARS);

  return (
    <div
      className="mt-2.5 flex h-9 items-end gap-[3px]"
      onPointerLeave={() => setOpenBarId(null)}
    >
      {bars.map((bar) => {
        const score =
          bar.matched && bar.matchScore != null
            ? Math.min(1, Math.max(0, bar.matchScore))
            : 0;
        // Magnitude → height (matched posts get a floor so they stay legible).
        const height = bar.matched ? Math.round(10 + score * 26) : 5;
        const isCreatorTextOnlyVideoMatch =
          bar.matchEvidence.primarySource === "creatorText" &&
          bar.matchEvidence.weight < 1;
        // The whole column is the hover/click target (easier to land on); on hover
        // a gold wash fills it and the bar turns gold.
        const columnClassName = cn(
          "group flex h-full min-w-[5px] flex-1 items-end rounded-[3px] transition-colors duration-75 hover:bg-amber-100/70",
          bar.url && "cursor-pointer",
        );
        const fill = (
          <span
            style={{ height }}
            className={cn(
              "w-full rounded-full transition-[height,background-color] duration-75",
              bar.matched
                ? cn(
                    PLATFORM_BAR_COLORS[bar.platform] ?? "bg-[#94a3b8]",
                    isCreatorTextOnlyVideoMatch && "opacity-55",
                  )
                : "bg-neutral-200",
              "group-hover:bg-amber-400 group-hover:opacity-100",
            )}
          />
        );

        return (
          <Tooltip
            key={bar.partnerContentItemId}
            content={<BarTooltip bar={bar} />}
            // Snappy bar-to-bar hover: open instantly, no grace area, no close animation.
            delayDuration={0}
            disableHoverableContent
            disableAnimation
            open={openBarId === bar.partnerContentItemId}
            onOpenChange={(nextOpen) =>
              setOpenBarId((current) =>
                nextOpen
                  ? bar.partnerContentItemId
                  : current === bar.partnerContentItemId
                    ? null
                    : current,
              )
            }
          >
            {bar.url ? (
              <a
                href={bar.url}
                target="_blank"
                rel="noopener noreferrer"
                className={columnClassName}
                aria-label={bar.title ?? "Open post"}
              >
                {fill}
              </a>
            ) : (
              <div className={columnClassName}>{fill}</div>
            )}
          </Tooltip>
        );
      })}
    </div>
  );
}

// Hover card for a content bar: platform, title, date · length · views (all cached).
function BarTooltip({
  bar,
}: {
  bar: NonNullable<
    PartnerContentSearchPartner["matchSummary"]
  >["contentBars"][number];
}) {
  const title = bar.title?.trim() || "Untitled content";
  const meta = [
    formatPublishedDate(bar.publishedAt),
    formatDuration(bar.durationMs),
    bar.viewCount && bar.viewCount > 0
      ? `${nFormatter(bar.viewCount)} views`
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="max-w-[240px] px-3 py-2">
      <div className="flex items-center gap-1.5">
        <PlatformIcon platform={bar.platform} className="size-3.5 shrink-0" />
        <span className="text-content-emphasis line-clamp-2 text-xs font-semibold">
          {title}
        </span>
      </div>
      {meta && (
        <div className="text-content-subtle mt-1 text-[11px]">{meta}</div>
      )}
    </div>
  );
}

function SearchFitPanel({
  error,
  isLoading,
  isRefining = false,
  summary: initialSummary,
  relevanceSummary,
  searchPartner,
}: {
  error: unknown;
  isLoading: boolean;
  // Scoped rerank in flight; when it lands, every row's relevance moves to one scale.
  isRefining?: boolean;
  summary?: PartnerContentSearchPartner["matchSummary"];
  // Scoped reranked summary, only to put per-row relevance on one scale. Null until it resolves.
  relevanceSummary?: PartnerContentSearchPartner["matchSummary"] | null;
  searchPartner?: PartnerContentSearchPartner;
}) {
  const [visibleAllCount, setVisibleAllCount] = useState(
    DETAIL_CONTENT_INITIAL_MATCH_COUNT,
  );
  const summary = initialSummary ?? searchPartner?.matchSummary;

  if (isLoading && !summary) {
    return <SearchFitPanelSkeleton />;
  }

  const isLoadingRows = isLoading || isRefining;
  // Per-item relevance on a single scale, from the scoped reranked summary.
  const unifiedRelevanceByItemId = buildUnifiedRelevanceMap(relevanceSummary);
  // Hold row rendering until the scoped run finishes so snippets/order don't swap in.
  const items = buildMatchedContentItems(
    summary,
    isLoadingRows ? [] : (searchPartner?.chunks ?? []),
    unifiedRelevanceByItemId,
  );

  // Top content: relevance + reach blend. All content: same set, newest-first.
  const topContent = [...items]
    .sort((a, b) => b.blendedScore - a.blendedScore)
    .slice(0, PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount);
  const allContent = [...items].sort(
    (a, b) => publishedAtMs(b.publishedAt) - publishedAtMs(a.publishedAt),
  );
  const visibleAll = allContent.slice(0, visibleAllCount);
  const hiddenAllCount = Math.max(0, allContent.length - visibleAll.length);
  // "All content" only earns its place when it adds rows beyond the top set.
  const showAllSection =
    !isLoadingRows &&
    allContent.length > PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount;

  const band = summary?.band ?? "none";
  const bandStyles = TOPIC_FIT_BAND_STYLES[band];
  const topPlatforms = summary?.topPlatforms?.length
    ? summary.topPlatforms
    : summary?.platforms ?? [];
  const lastOnTopic = lastPostedLabel(summary?.lastOnTopicAt ?? null);
  const rankWindowPhrase = formatRankWindowPhrase(summary);
  const topContentCaption = rankWindowPhrase
    ? `Ranked by relevance + reach across ${rankWindowPhrase}.`
    : "Ranked by relevance + reach.";

  return (
    <div className="flex flex-col">
      {/* Topic fit summary row — layout adapted from the Partner Search hi-fi ref */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="shrink-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Topic fit
          </div>
          <div className="mt-1.5 flex items-end gap-2.5">
            <span
              className={cn(
                "text-[34px] font-bold leading-none tabular-nums",
                bandStyles.number,
              )}
            >
              {summary?.topicFit ?? "—"}
            </span>
            <span
              className={cn(
                "mb-1 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                bandStyles.chip,
              )}
            >
              {BAND_LABELS[band]}
            </span>
          </div>
        </div>

        <div className="h-10 w-px shrink-0 bg-neutral-200" />

        <div className="min-w-[200px] flex-1">
          <div className="text-content-default flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium">
            {summary?.followers ? (
              <span>{nFormatter(summary.followers)} followers</span>
            ) : null}
            {summary?.followers && summary?.medianViews ? (
              <span className="text-neutral-300">·</span>
            ) : null}
            {summary?.medianViews ? (
              <span>{nFormatter(summary.medianViews)} median views</span>
            ) : null}
          </div>
          <ContentMatchBars summary={summary} />
          {summary && (
            <div className="text-content-subtle mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <span>
                {summary.matchedContentCount} of {summary.recentContentCount}{" "}
                matching
              </span>
              {topPlatforms.length > 0 && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>matched on</span>
                  <span className="flex items-center gap-1">
                    {topPlatforms.map((platform) => (
                      <PlatformIcon
                        key={platform}
                        platform={platform}
                        className="size-3.5"
                      />
                    ))}
                  </span>
                </>
              )}
              {lastOnTopic && (
                <>
                  <span className="text-neutral-300">·</span>
                  <span>last post {lastOnTopic}</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        {/* Top content — ranked by the relevance + reach blend */}
        <div className="flex flex-col gap-1">
          <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
            Top content
          </h3>
          <p className="text-content-muted text-[11px] font-medium">
            {topContentCaption}
            {isRefining && (
              <span className="text-content-muted/70"> · refining match…</span>
            )}
          </p>
        </div>

        <div className="divide-border-subtle mt-3 divide-y">
          {error ? (
            <div className="text-content-subtle py-3.5 text-sm">
              Failed to load search matches
            </div>
          ) : isLoadingRows ? (
            <ContentMatchSkeletons
              count={PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount}
            />
          ) : topContent.length ? (
            topContent.map((item) => (
              <ContentMatchRow key={item.contentItemId} item={item} />
            ))
          ) : (
            <div className="text-content-subtle py-3.5 text-sm">
              No matching content found for this partner.
            </div>
          )}
        </div>

        {/* All content — same matched set, simply most-recent-first */}
        {showAllSection && (
          <div className="mt-6">
            <div className="flex flex-col gap-1">
              <h3 className="text-content-subtle text-[11px] font-semibold uppercase tracking-wide">
                All content
              </h3>
              <p className="text-content-muted text-[11px] font-medium">
                Most recent first
              </p>
            </div>

            <div className="divide-border-subtle mt-3 divide-y">
              {visibleAll.map((item) => (
                <ContentMatchRow key={item.contentItemId} item={item} />
              ))}
            </div>

            {hiddenAllCount > 0 ? (
              <div className="mt-4 flex justify-center">
                <Button
                  type="button"
                  variant="secondary"
                  text={`Show ${Math.min(
                    hiddenAllCount,
                    DETAIL_CONTENT_MATCH_INCREMENT,
                  )} more`}
                  onClick={() =>
                    setVisibleAllCount(
                      (count) => count + DETAIL_CONTENT_MATCH_INCREMENT,
                    )
                  }
                  className="h-9 rounded-lg px-4"
                />
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function SearchFitPanelSkeleton() {
  return (
    <div className="flex flex-col" aria-busy="true">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <div className="shrink-0">
          <div className="h-3 w-16 animate-pulse rounded bg-neutral-200" />
          <div className="mt-2 flex items-end gap-2.5">
            <div className="h-9 w-14 animate-pulse rounded bg-neutral-200" />
            <div className="mb-1 h-6 w-20 animate-pulse rounded-full bg-neutral-100" />
          </div>
        </div>

        <div className="h-10 w-px shrink-0 bg-neutral-200" />

        <div className="min-w-[200px] flex-1">
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-neutral-200" />
          <div className="mt-2.5 flex h-9 items-end gap-[3px]">
            {[...Array(18)].map((_, index) => (
              <div
                key={index}
                className="min-w-[5px] flex-1 animate-pulse rounded-full bg-neutral-100"
                style={{ height: 6 + (index % 5) * 6 }}
              />
            ))}
          </div>
          <div className="mt-2 h-3 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
      </div>

      <div className="border-border-subtle mt-5 border-t pt-5">
        <div className="flex flex-col gap-1">
          <div className="h-3 w-20 animate-pulse rounded bg-neutral-200" />
          <div className="h-3 w-72 max-w-full animate-pulse rounded bg-neutral-100" />
        </div>
        <div className="divide-border-subtle mt-3 divide-y">
          <ContentMatchSkeletons
            count={PARTNER_CONTENT_SEARCH_TOP_CONTENT.topContentCount}
          />
        </div>
      </div>
    </div>
  );
}

function ContentMatchSkeletons({ count }: { count: number }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 py-3">
          <div className="h-14 w-[88px] shrink-0 animate-pulse rounded-lg bg-neutral-100" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <div className="size-3.5 shrink-0 animate-pulse rounded-full bg-neutral-100" />
              <div className="h-4 w-48 max-w-full animate-pulse rounded bg-neutral-200" />
            </div>
            <div className="mt-1 h-3 w-40 max-w-full animate-pulse rounded bg-neutral-100" />
            <div className="mt-2 h-4 w-80 max-w-full animate-pulse rounded bg-neutral-100" />
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div className="h-5 w-12 animate-pulse rounded-md bg-neutral-100" />
            <div className="h-2.5 w-8 animate-pulse rounded bg-neutral-100" />
          </div>
        </div>
      ))}
    </>
  );
}

// A matched post for the detail lists: from the cached summary's bars, enriched
// with a loaded chunk (snippet, timed transcript, thumbnail) when available.
type MatchedContentItem = {
  contentItemId: string;
  platform: string;
  platformContentId: string;
  title: string | null;
  url: string | null;
  durationMs: number | null;
  publishedAt: string | null;
  viewCount: number | null;
  // The displayed relevance rating (0-1); also feeds the blend.
  relevance: number;
  // Relevance + reach blend, used only to order the Top content list.
  blendedScore: number;
  matchEvidence: PartnerContentMatchEvidence;
  chunk?: PartnerContentSearchPartner["chunks"][number];
};

// Per-item relevance from the scoped reranked summary (one scale; the cached global
// summary mixes rerank + cosine). Includes any item with evidence, not just matched.
function buildUnifiedRelevanceMap(
  relevanceSummary: PartnerContentSearchPartner["matchSummary"] | null | undefined,
) {
  const map = new Map<string, number>();
  for (const bar of relevanceSummary?.contentBars ?? []) {
    const score = getEvidenceDisplayScore(bar.matchEvidence);
    if (score != null) map.set(bar.partnerContentItemId, score);
  }
  return map;
}

function buildMatchedContentItems(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
  chunks: PartnerContentSearchPartner["chunks"],
  unifiedRelevanceByItemId?: Map<string, number>,
): MatchedContentItem[] {
  const bars = summary?.contentBars ?? [];

  // Best loaded chunk per content item, for snippet/thumbnail enrichment.
  const chunkByContentItemId = new Map<
    string,
    PartnerContentSearchPartner["chunks"][number]
  >();
  for (const chunk of chunks) {
    const current = chunkByContentItemId.get(chunk.partnerContentItemId);
    if (!current || chunk.score > current.score) {
      chunkByContentItemId.set(chunk.partnerContentItemId, chunk);
    }
  }

  // Per-creator engagement baseline: median recent views (matched + unmatched).
  const baselineViews = getViewBaseline(bars.map((bar) => bar.viewCount));

  return bars
    .filter((bar) => bar.matched)
    .map((bar) => {
      // Prefer the unified single-scale relevance once the rerank lands; else cached.
      const relevance =
        unifiedRelevanceByItemId?.get(bar.partnerContentItemId) ??
        getEvidenceDisplayScore(bar.matchEvidence) ??
        bar.matchScore ??
        0;

      return {
        contentItemId: bar.partnerContentItemId,
        platform: bar.platform,
        platformContentId: bar.platformContentId,
        title: bar.title,
        url: bar.url,
        durationMs: bar.durationMs,
        publishedAt: bar.publishedAt,
        viewCount: bar.viewCount,
        relevance,
        blendedScore: getBlendedTopContentScore({
          relevance,
          views: bar.viewCount,
          baselineViews,
        }),
        matchEvidence: bar.matchEvidence,
        chunk: chunkByContentItemId.get(bar.partnerContentItemId),
      };
    });
}

function publishedAtMs(iso: string | null) {
  if (!iso) return -Infinity;
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? -Infinity : ms;
}

function ContentMatchRow({ item }: { item: MatchedContentItem }) {
  const { chunk } = item;
  const evidence = item.matchEvidence;
  const isTimedTranscriptMatch = chunk
    ? hasTimedTranscriptMatch(chunk.chunk)
    : false;
  const timeLabel =
    chunk && isTimedTranscriptMatch
      ? formatChunkTimeRange(chunk.chunk)
      : formatDuration(item.durationMs);
  const dateLabel = formatPublishedDate(item.publishedAt);
  const matchTags = getMatchTags(
    evidence,
    chunk?.chunk.source ??
      (evidence.primarySource === "creatorText" ? "metadata" : "transcript"),
  );
  const snippet = chunk ? getMatchSnippet(chunk) : null;
  const excerpt = snippet ? `"…${snippet.slice(0, 130).trimEnd()}…"` : null;
  const thumbnail = getItemThumbnail(item);
  const meta = [timeLabel, dateLabel].filter(Boolean).join(" · ");
  const score = item.relevance;
  const title = getItemTitle(item);
  const viewCount = item.viewCount;

  return (
    <a
      href={getItemHref(item)}
      target="_blank"
      rel="noopener noreferrer"
      className="group hover:bg-bg-muted flex items-center gap-3.5 py-3 transition-colors"
    >
      {/* Preview image */}
      <div className="bg-bg-subtle relative h-14 w-[88px] shrink-0 overflow-hidden rounded-lg">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt=""
            className="size-full object-cover transition-transform duration-150 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <PlatformIcon platform={item.platform} className="size-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <PlatformIcon platform={item.platform} className="size-3.5 shrink-0" />
          <span className="text-content-emphasis truncate text-sm font-semibold">
            {title}
          </span>
        </div>
        <div className="text-content-subtle mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          {meta && <span>{meta}</span>}
          {matchTags.length > 0 && (
            <>
              {meta && <span className="text-content-muted">·</span>}
              <span className="flex flex-wrap items-center gap-1">
                {matchTags.map((tag) => (
                  <span
                    key={tag.source}
                    className={cn(
                      tag.source === "transcript"
                        ? "text-blue-600"
                        : "text-content-subtle",
                    )}
                  >
                    {tag.label}
                  </span>
                ))}
              </span>
            </>
          )}
          {viewCount != null && viewCount > 0 && (
            <>
              <span className="text-content-muted">·</span>
              <span>{nFormatter(viewCount)} views</span>
            </>
          )}
        </div>
        {excerpt && (
          <p className="text-content-subtle mt-1 line-clamp-1 text-sm">
            {excerpt}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <span className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-blue-700">
          {formatMatchPercent(score)}
        </span>
        <span className="text-content-muted text-[10px] font-medium uppercase tracking-wide">
          match
        </span>
      </div>
    </a>
  );
}

function getEvidenceDisplayScore(
  evidence: PartnerContentMatchEvidence | undefined,
) {
  if (!evidence || evidence.sources.length === 0) return null;

  return Math.max(
    evidence.transcriptScore ?? 0,
    evidence.creatorTextScore ?? 0,
  );
}

function getMatchTags(
  evidence: PartnerContentMatchEvidence | undefined,
  fallbackSource: string,
) {
  const sources = evidence?.sources.length
    ? evidence.sources
    : fallbackSource === "metadata"
      ? ["creatorText" as const]
      : ["transcript" as const];

  return sources.map((source) => ({
    source,
    label: source === "transcript" ? "Transcript" : "Creator text",
  }));
}

// Displayed snippet. Transcript chunks are prose; creator-text chunks store the raw
// embedding input, so we surface just the creator-entered text.
function getMatchSnippet(chunk: PartnerContentSearchPartner["chunks"][number]) {
  const text = (chunk.chunk.text ?? "").trim();
  if (!text) return null;
  if (chunk.chunk.source !== "metadata") return text;

  const description = text.match(/Description:\s*([\s\S]+)$/i)?.[1];
  return (
    (
      description ?? text.replace(/^Content type:[\s\S]*?Title:\s*/i, "")
    ).trim() || null
  );
}

function PlatformIcon({
  platform,
  className,
}: {
  platform: string;
  className?: string;
}) {
  const Icon =
    platform === "youtube"
      ? YouTube
      : platform === "instagram"
        ? Instagram
        : platform === "tiktok"
          ? TikTok
          : null;

  return Icon ? <Icon className={cn("size-4", className)} /> : null;
}

// Item thumbnail: the loaded chunk's preview, else a YouTube thumbnail from the id.
function getItemThumbnail(item: MatchedContentItem) {
  if (item.chunk) return getContentThumbnail(item.chunk);
  if (item.platform === "youtube" && item.platformContentId) {
    return `https://i.ytimg.com/vi/${item.platformContentId}/hqdefault.jpg`;
  }
  return null;
}

function getItemTitle(item: MatchedContentItem) {
  if (item.chunk) return getContentTitle(item.chunk);
  return item.title?.trim() || "Untitled content";
}

// Link for a matched item: the chunk-aware href (YouTube deep-link timestamp,
// Instagram normalization) when enriched, otherwise the bar's canonical URL.
function getItemHref(item: MatchedContentItem) {
  if (item.chunk) return getContentHref(item.chunk);
  return item.url ?? "#";
}

// Noun phrase for the rank window (time-based but capped per partner); says so
// explicitly when the cap bites instead of implying full coverage.
function formatRankWindowPhrase(
  summary: PartnerContentSearchPartner["matchSummary"] | undefined,
) {
  if (!summary || !summary.recentContentCount) return null;

  const { recentContentCount, oldestPublishedAt, newestPublishedAt } = summary;
  const oldest = formatMonthYear(oldestPublishedAt);
  const newest = formatMonthYear(newestPublishedAt);
  const countCapped =
    recentContentCount >= PARTNER_CONTENT_SEARCH_LIMITS.recentContentMaxPerPartner;

  if (countCapped) {
    return oldest
      ? `the ${recentContentCount} most recent posts, back to ${oldest}`
      : `the ${recentContentCount} most recent posts`;
  }

  if (oldest && newest) {
    return oldest === newest
      ? `${recentContentCount} ${
          recentContentCount === 1 ? "post" : "posts"
        } from ${oldest}`
      : `${recentContentCount} posts, ${oldest} – ${newest}`;
  }

  return `${recentContentCount} recent ${
    recentContentCount === 1 ? "post" : "posts"
  }`;
}

function formatMonthYear(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
  }).format(date);
}

function hasTimedTranscriptMatch({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  return source !== "metadata" && (startMs !== null || endMs !== null);
}

function formatChunkTimeRange({
  source,
  startMs,
  endMs,
}: PartnerContentSearchPartner["chunks"][number]["chunk"]) {
  if (source === "metadata") return "Creator text match";
  if (startMs === null && endMs === null) return "Transcript match";
  if (startMs !== null && endMs !== null) {
    return `${formatTimestamp(startMs)} - ${formatTimestamp(endMs)}`;
  }
  return formatTimestamp(startMs ?? endMs ?? 0);
}

function getBackQueryString(searchParams: { toString(): string }) {
  const params = new URLSearchParams(searchParams.toString());
  const queryString = params.toString();

  return queryString ? `?${queryString}` : "";
}

function getPartnerApiPath({
  workspaceId,
  partnerStatus,
  partnerId,
  country,
}: {
  workspaceId: string;
  partnerStatus: string;
  partnerId: string;
  country?: string;
}) {
  const params = new URLSearchParams({
    workspaceId,
    status: partnerStatus,
    partnerIds: partnerId,
    pageSize: "1",
  });

  if (country) params.set("country", country);

  return `/api/network/partners?${params}`;
}
