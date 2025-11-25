import useDomains from "@/lib/swr/use-domains";
import useFolders from "@/lib/swr/use-folders";
import useUsage from "@/lib/swr/use-usage";
import { FolderIcon } from "@/ui/folders/folder-icon";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  BlurImage,
  EmptyState,
  Filter,
  LoadingSpinner,
  useRouterStuff,
} from "@dub/ui";
import { Bars, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { CursorRays, Folder, Globe2, Hyperlink } from "@dub/ui/icons";
import { cn, formatDate, GOOGLE_FAVICON_URL, nFormatter } from "@dub/utils";
import { ComponentProps, Fragment, useEffect, useMemo } from "react";

const BAR_COLORS = [
  "text-blue-500",
  "text-indigo-500",
  "text-red-500",
  "text-emerald-500",
  "text-purple-500",
  "text-sky-500",
  "text-orange-500",
  "text-lime-500",
  "text-pink-500",
];

const RESOURCES = ["links", "events"] as const;
const resourceEmptyStates: Record<
  (typeof RESOURCES)[number],
  ComponentProps<typeof EmptyState>
> = {
  links: {
    icon: Hyperlink,
    title: "Links Created",
    description:
      "No short links have been created in the current billing cycle.",
  },
  events: {
    icon: CursorRays,
    title: "Events Tracked",
    description: "No events have been tracked in the current billing cycle.",
  },
};

export function UsageChart() {
  const { queryParams, searchParamsObj } = useRouterStuff();

  const {
    usage: usageTmp,
    loading,
    activeResource,
    start,
    end,
    interval,
  } = useUsage();

  // TODO: Remove this once the usage endpoint is updated and rename `usageTmp` back to `usage`
  const usage = useMemo(
    () =>
      usageTmp?.map(({ date, value }) => ({
        date: new Date(date),
        value,
        groupBy: "folderId",
        groups: [
          {
            id: "unsorted",
            name: "Unsorted",
            usage: Math.floor(value / 2),
          },
          {
            id: "fold_a4zhcvDsfZpU5qAcfGWZWVbO",
            name: "Folder 1",
            usage: Math.floor(Math.ceil(value / 2) / 2),
          },
          {
            id: "fold_MC0mryfmC8Ld260XM9qRl4H8",
            name: "Folder 2",
            usage: Math.ceil(Math.ceil(value / 2) / 2),
          },
        ],
      })),
    [usageTmp],
  );

  // Get filter values from URL params
  const folderId = searchParamsObj.folderId;
  const domain = searchParamsObj.domain;

  // Clear folder and domain filters when switching away from "links" tab
  useEffect(() => {
    if (activeResource !== "links" && (folderId || domain)) {
      queryParams({
        del: ["folderId", "domain"],
        scroll: false,
      });
    }
  }, [activeResource, folderId, domain, queryParams]);

  // Fetch folders and domains for filter options
  const { folders } = useFolders();
  const { allDomains: domains } = useDomains({ ignoreParams: true });

  // Filter handlers
  const onSelect = (key: string, value: string) => {
    queryParams({
      set: { [key]: value },
      scroll: false,
    });
  };

  const onRemove = (key: string) => {
    queryParams({
      del: key,
      scroll: false,
    });
  };

  const onRemoveAll = () => {
    queryParams({
      del: ["folderId", "domain"],
      scroll: false,
    });
  };

  // Define filters (only show folder and domain filters when resource is "links")
  const filters = useMemo(() => {
    if (activeResource !== "links") return [];

    return [
      {
        key: "folderId",
        icon: Folder,
        label: "Folder",
        options:
          folders?.map((folder) => ({
            value: folder.id,
            icon: (
              <FolderIcon
                folder={folder}
                shape="square"
                iconClassName="size-3"
              />
            ),
            label: folder.name,
          })) ?? [],
      },
      {
        key: "domain",
        icon: Globe2,
        label: "Domain",
        options:
          domains?.map((domain) => ({
            value: domain.slug,
            label: domain.slug,
            icon: (
              <BlurImage
                src={`${GOOGLE_FAVICON_URL}${domain.slug}`}
                alt={domain.slug}
                className="h-4 w-4 rounded-full"
                width={16}
                height={16}
              />
            ),
          })) ?? [],
      },
    ];
  }, [activeResource, folders, domains]);

  // Active filters
  const activeFilters = useMemo(() => {
    const filters: { key: string; value: string }[] = [];
    if (folderId) {
      filters.push({ key: "folderId", value: folderId });
    }
    if (domain) {
      filters.push({ key: "domain", value: domain });
    }
    return filters;
  }, [folderId, domain]);

  const chartData = useMemo(
    () =>
      usage?.map(({ date, value, groups }) => ({
        date: new Date(date),
        values: {
          usage: value,
          ...Object.fromEntries(groups.map((group) => [group.id, group.usage])),
        },
      })),
    [usage, activeResource],
  );

  const groupColors = useMemo(
    () =>
      Object.fromEntries(
        usage?.[0]?.groups?.map((g, idx) => [
          g.id,
          BAR_COLORS[idx % BAR_COLORS.length],
        ]) ?? [],
      ),
    [usage],
  );

  const allZeroes = useMemo(
    () => chartData?.every(({ values }) => values.usage === 0),
    [chartData],
  );

  return (
    <div className={cn("space-y-4 pt-8")}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
          <SimpleDateRangePicker values={{ start, end, interval }} />
        </div>
        <AnimatedSizeContainer height>
          {activeFilters.length > 0 && (
            <Filter.List
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
              onRemoveAll={onRemoveAll}
            />
          )}
        </AnimatedSizeContainer>
      </div>

      {/* Chart */}
      <div className="h-64">
        {chartData && chartData.length > 0 ? (
          !allZeroes ? (
            <TimeSeriesChart
              key={activeResource}
              type="bar"
              data={chartData}
              series={[
                {
                  id: "usage",
                  valueAccessor: (d) => d.values.usage,
                  colorClassName: "text-violet-500",
                  isActive: false,
                },
                ...(usage?.[0]?.groups?.map((group) => ({
                  id: group.id,
                  valueAccessor: (d) => d.values[group.id],
                  colorClassName: groupColors[group.id],
                  isActive: true,
                })) ?? []),
              ]}
              tooltipClassName="p-0 overflow-hidden"
              tooltipContent={(d) => {
                const topGroups = usage?.[0]?.groups
                  ?.filter((group) => d.values[group.id] > 0)
                  .sort((a, b) => b.usage - a.usage)
                  .slice(0, 8);

                return (
                  <>
                    <div className="flex items-center justify-between gap-4 px-4 py-3 text-xs">
                      <span className="text-content-emphasis font-semibold">
                        {formatDate(d.date, { month: "short" })}
                      </span>
                      <span className="text-content-default font-medium">
                        {nFormatter(d.values.usage, { full: true })}
                      </span>
                    </div>
                    {Boolean(topGroups?.length) && (
                      <div className="border-border-subtle relative grid grid-cols-2 gap-x-6 gap-y-2 overflow-hidden border-t px-4 py-3 text-xs">
                        {topGroups?.map((group) => {
                          const value = d.values[group.id];
                          if (!value) return null;

                          return (
                            <Fragment key={group.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "size-2 rounded-sm bg-current shadow-[inset_0_0_0_1px_#0003]",
                                    groupColors[group.id],
                                  )}
                                />
                                <span className="text-neutral-600">
                                  {group.name}
                                </span>
                              </div>
                              <span className="text-right font-medium text-neutral-900">
                                {nFormatter(value, { full: true })}
                              </span>
                            </Fragment>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              }}
            >
              <XAxis highlightLast={false} />
              <YAxis showGridLines tickFormat={nFormatter} />
              <Bars
              // seriesStyles={[
              //   {
              //     id: "usage",
              //     barFill: "#2563eb",
              //   },
              // ]}
              />
            </TimeSeriesChart>
          ) : (
            <div className="flex size-full items-center justify-center">
              <EmptyState {...resourceEmptyStates[activeResource]} />
            </div>
          )
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-neutral-500">
            {loading ? <LoadingSpinner /> : <p>Failed to load usage data</p>}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2"></div>
    </div>
  );
}
