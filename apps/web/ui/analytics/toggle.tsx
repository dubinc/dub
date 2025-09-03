import {
  DUB_LINKS_ANALYTICS_INTERVAL,
  INTERVAL_DISPLAYS,
} from "@/lib/analytics/constants";
import { validDateRangeForPlan } from "@/lib/analytics/utils";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import useWorkspace from "@/lib/swr/use-workspace";
import {
  BlurImage,
  Button,
  ChartLine,
  DateRangePicker,
  ExpandingArrow,
  Filter,
  SquareLayoutGrid6,
  TooltipContent,
  useMediaQuery,
  useRouterStuff,
  useScroll,
} from "@dub/ui";
import {
  APP_DOMAIN,
  cn,
  DUB_DEMO_LINKS,
  DUB_LOGO,
  getApexDomain,
  getNextPlan,
  GOOGLE_FAVICON_URL,
  linkConstructor,
} from "@dub/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useContext } from "react";
import AnalyticsOptions from "./analytics-options";
import { AnalyticsContext } from "./analytics-provider";
import EventsOptions from "./events/events-options";
import { ShareButton } from "./share-button";
import { useAnalyticsFilters } from "./use-analytics-filters";

export default function Toggle({
  page = "analytics",
}: {
  page?: "analytics" | "events";
}) {
  const { slug, programSlug } = useParams();
  const { plan, createdAt } = useWorkspace();

  const { queryParams, getQueryString } = useRouterStuff();

  const {
    domain,
    key,
    url,
    adminPage,
    partnerPage,
    dashboardProps,
    start,
    end,
    interval,
  } = useContext(AnalyticsContext);

  const scrolled = useScroll(120);

  const { isMobile } = useMediaQuery();

  const {
    filters,
    activeFilters,
    setSearch,
    setSelectedFilter,
    onSelect,
    onRemove,
    onRemoveAll,
    onOpenFilter,
    streaming,
    activeFiltersWithStreaming,
  } = useAnalyticsFilters({ partnerPage, dashboardProps });

  const filterSelect = (
    <Filter.Select
      className="w-full md:w-fit"
      filters={filters}
      activeFilters={activeFilters}
      onSearchChange={setSearch}
      onSelectedFilterChange={setSelectedFilter}
      onSelect={onSelect}
      onRemove={onRemove}
      onOpenFilter={onOpenFilter}
      askAI
    />
  );

  const dateRangePicker = (
    <DateRangePicker
      className="w-full sm:min-w-[160px] md:w-fit lg:min-w-[200px]"
      align={dashboardProps ? "end" : "center"}
      value={
        start && end
          ? {
              from: start,
              to: end,
            }
          : undefined
      }
      presetId={
        start && end ? undefined : interval ?? DUB_LINKS_ANALYTICS_INTERVAL
      }
      onChange={(range, preset) => {
        if (preset) {
          queryParams({
            del: ["start", "end"],
            set: {
              interval: preset.id,
            },
            scroll: false,
          });

          return;
        }

        // Regular range
        if (!range || !range.from || !range.to) return;

        queryParams({
          del: "preset",
          set: {
            start: range.from.toISOString(),
            end: range.to.toISOString(),
          },
          scroll: false,
        });
      }}
      presets={INTERVAL_DISPLAYS.map(({ display, value, shortcut }) => {
        const requiresUpgrade =
          partnerPage ||
          DUB_DEMO_LINKS.find((l) => l.domain === domain && l.key === key)
            ? false
            : !validDateRangeForPlan({
                plan: plan || dashboardProps?.workspacePlan,
                dataAvailableFrom: createdAt,
                interval: value,
                start,
                end,
              });

        const { startDate, endDate } = getStartEndDates({
          interval: value,
          dataAvailableFrom: createdAt,
        });

        return {
          id: value,
          label: display,
          dateRange: {
            from: startDate,
            to: endDate,
          },
          requiresUpgrade,
          tooltipContent: requiresUpgrade ? (
            <UpgradeTooltip rangeLabel={display} plan={plan} />
          ) : undefined,
          shortcut,
        };
      })}
    />
  );

  // TODO: [PageContent] Remove once all pages are migrated to the new PageContent
  const isAppPage = !dashboardProps && !adminPage;

  return (
    <>
      <div
        className={cn("py-3 md:py-3", isAppPage && "pt-0 md:pt-0", {
          "sticky top-14 z-10 bg-neutral-50": dashboardProps,
          "sticky top-16 z-10 bg-neutral-50": adminPage,
          "shadow-md": scrolled && dashboardProps,
        })}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-screen-xl flex-col gap-2 px-3 lg:px-10",
            isAppPage && "lg:px-6",
            {
              "md:h-10": key,
            },
          )}
        >
          <div
            className={cn(
              "flex w-full flex-col items-center justify-between gap-2 md:flex-row",
              {
                "flex-col md:flex-row": !key,
                "items-center": key,
              },
            )}
          >
            {dashboardProps && (
              <a
                className="group flex items-center text-lg font-semibold text-neutral-800"
                href={linkConstructor({ domain, key })}
                target="_blank"
                rel="noreferrer"
              >
                <BlurImage
                  alt={url || "Dub"}
                  src={
                    url
                      ? `${GOOGLE_FAVICON_URL}${getApexDomain(url)}`
                      : DUB_LOGO
                  }
                  className="mr-2 h-6 w-6 flex-shrink-0 overflow-hidden rounded-full"
                  width={48}
                  height={48}
                />
                <p className="max-w-[192px] truncate sm:max-w-[400px]">
                  {linkConstructor({
                    domain,
                    key,
                    pretty: true,
                  })}
                </p>
                <ExpandingArrow className="h-5 w-5" />
              </a>
            )}
            <div
              className={cn(
                "flex w-full flex-col-reverse items-center gap-2 min-[550px]:flex-row",
                dashboardProps && "md:w-auto",
              )}
            >
              {isMobile ? dateRangePicker : filterSelect}
              <div
                className={cn("flex w-full grow items-center gap-2 md:w-auto", {
                  "grow-0": dashboardProps,
                })}
              >
                {isMobile ? filterSelect : dateRangePicker}
                {!dashboardProps && (
                  <div className="flex grow justify-end gap-2">
                    {page === "analytics" && (
                      <>
                        {domain && key && <ShareButton />}
                        <Link
                          href={`/${partnerPage ? `programs/${programSlug}/` : adminPage ? "" : `${slug}/`}events${getQueryString()}`}
                        >
                          <Button
                            variant="secondary"
                            className="w-fit"
                            icon={
                              <SquareLayoutGrid6 className="h-4 w-4 text-neutral-600" />
                            }
                            text={isMobile ? undefined : "Switch to Events"}
                          />
                        </Link>
                        <AnalyticsOptions />
                      </>
                    )}
                    {page === "events" && (
                      <>
                        <Link
                          href={`/${partnerPage ? `programs/${programSlug}/` : adminPage ? "" : `${slug}/`}analytics${getQueryString()}`}
                        >
                          <Button
                            variant="secondary"
                            className="w-fit"
                            icon={
                              <ChartLine className="h-4 w-4 text-neutral-600" />
                            }
                            text={isMobile ? undefined : "Switch to Analytics"}
                          />
                        </Link>
                        <EventsOptions />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mx-auto w-full max-w-screen-xl px-3 lg:px-10",
          isAppPage && "lg:px-6",
        )}
      >
        <Filter.List
          filters={filters}
          activeFilters={activeFiltersWithStreaming}
          onRemove={onRemove}
          onRemoveAll={onRemoveAll}
        />
        <div
          className={cn(
            "transition-[height] duration-[300ms]",
            streaming || activeFilters.length ? "h-3" : "h-0",
          )}
        />
      </div>
    </>
  );
}

function UpgradeTooltip({
  rangeLabel,
  plan,
}: {
  rangeLabel: string;
  plan?: string;
}) {
  const { slug } = useWorkspace();

  const isAllTime = rangeLabel === "All Time";

  return (
    <TooltipContent
      title={`${rangeLabel} can only be viewed on a ${isAllTime ? "Business" : getNextPlan(plan).name} plan or higher. Upgrade now to view more stats.`}
      cta={`Upgrade to ${isAllTime ? "Business" : getNextPlan(plan).name}`}
      href={slug ? `/${slug}/upgrade` : APP_DOMAIN}
    />
  );
}
