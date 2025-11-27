import useDomains from "@/lib/swr/use-domains";
import useFolders from "@/lib/swr/use-folders";
import useUsage from "@/lib/swr/use-usage";
import { BarList } from "@/ui/analytics/bar-list";
import { FolderIcon } from "@/ui/folders/folder-icon";
import SimpleDateRangePicker from "@/ui/shared/simple-date-range-picker";
import {
  AnimatedSizeContainer,
  BlurImage,
  EmptyState,
  Filter,
  LoadingSpinner,
  Modal,
  ToggleGroup,
  useRouterStuff,
} from "@dub/ui";
import { Bars, TimeSeriesChart, XAxis, YAxis } from "@dub/ui/charts";
import { CursorRays, Folder, Globe2, Hyperlink } from "@dub/ui/icons";
import { cn, formatDate, GOOGLE_FAVICON_URL, nFormatter } from "@dub/utils";
import NumberFlow, { NumberFlowGroup } from "@number-flow/react";
import {
  ComponentProps,
  Fragment,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
    description: "No short links have been created in the selected date range.",
  },
  events: {
    icon: CursorRays,
    title: "Events Tracked",
    description: "No events have been tracked in the selected date range.",
  },
};

export function UsageChart() {
  const { queryParams, searchParamsObj } = useRouterStuff();

  const {
    usage,
    loading,
    isValidating,
    activeResource,
    start,
    end,
    interval,
    groupBy,
  } = useUsage();

  // Get filter values from URL params
  const folderId = searchParamsObj.folderId;
  const domain = searchParamsObj.domain;

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

  const filters = useMemo(
    () => [
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
    ],
    [activeResource, folders, domains],
  );

  // Active filters
  const activeFilters = useMemo(() => {
    const filters: { key: string; value: string }[] = [];
    if (folderId) filters.push({ key: "folderId", value: folderId });
    if (domain) filters.push({ key: "domain", value: domain });
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

  const groupsMeta = useMemo(
    () =>
      Object.fromEntries(
        usage?.[0]?.groups?.map((g, idx) => [
          g.id,
          {
            name: g.name,
            colorClassName: BAR_COLORS[idx % BAR_COLORS.length],
            total: usage.reduce(
              (sum, { groups }) =>
                sum + (groups.find(({ id }) => id === g.id)?.usage ?? 0),
              0,
            ),
          },
        ]) ?? [],
      ),
    [usage],
  );

  const totalUsage = useMemo(
    () => usage?.reduce((sum, { value }) => sum + value, 0) ?? 0,
    [usage],
  );

  // Map dates to indices for O(1) hover lookups
  const usageIndexByDate = useMemo(() => {
    if (!usage) return null;
    const map = new Map<number, number>();
    usage.forEach((u, index) => {
      map.set(new Date(u.date).getTime(), index);
    });
    return map;
  }, [usage]);

  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  // Throttle hover updates to animation frames to avoid excessive rerenders
  const hoverRafRef = useRef<number | null>(null);
  const handleHoverDateChange = useCallback((date: Date | null) => {
    if (hoverRafRef.current !== null) return;

    hoverRafRef.current = window.requestAnimationFrame(() => {
      hoverRafRef.current = null;
      setHoveredDate(date);
    });
  }, []);

  useEffect(
    () => () => {
      if (hoverRafRef.current !== null) {
        window.cancelAnimationFrame(hoverRafRef.current);
      }
    },
    [],
  );

  const hoveredGroupsMeta = useMemo(() => {
    if (!hoveredDate || !usage || !usageIndexByDate) return null;

    const index = usageIndexByDate.get(hoveredDate.getTime());
    if (index == null) return null;

    const dayUsage = usage[index];

    return Object.fromEntries(
      dayUsage.groups.map((g, idx) => [
        g.id,
        {
          name: g.name,
          colorClassName: BAR_COLORS[idx % BAR_COLORS.length],
          total: g.usage,
        },
      ]),
    );
  }, [hoveredDate, usage, usageIndexByDate]);

  const hoveredTotalUsage = useMemo(() => {
    if (!hoveredDate || !usage || !usageIndexByDate) return null;

    const index = usageIndexByDate.get(hoveredDate.getTime());
    if (index == null) return null;

    return usage[index].value;
  }, [hoveredDate, usage, usageIndexByDate]);

  // Defer updates to the breakdown list below so tooltip + chart hover stay snappy
  const deferredHoveredGroupsMeta = useDeferredValue(hoveredGroupsMeta);
  const deferredHoveredTotalUsage = useDeferredValue(hoveredTotalUsage);

  const allZeroes = useMemo(
    () => chartData?.every(({ values }) => values.usage === 0),
    [chartData],
  );

  const sortedGroupEntries = useMemo(
    () =>
      groupsMeta
        ? Object.entries(groupsMeta).sort((a, b) => b[1].total - a[1].total)
        : [],
    [groupsMeta],
  );

  const [showGroupsModal, setShowGroupsModal] = useState(false);

  const hasMoreGroups = sortedGroupEntries.length > 12;

  const barListTabLabel =
    groupBy === "folderId"
      ? "Folder"
      : groupBy === "domain"
        ? "Domain"
        : "Group";

  const barListData = useMemo(
    () =>
      sortedGroupEntries.map(([id, meta]) => {
        let href: string | undefined;

        if (groupBy === "folderId" || groupBy === "domain") {
          const hasFilter = searchParamsObj?.[groupBy] === id;
          href = queryParams({
            ...(hasFilter
              ? { del: groupBy }
              : {
                  set: {
                    [groupBy]: id,
                  },
                }),
            getNewPath: true,
          }) as string;
        }

        return {
          icon: (
            <div
              className={cn(
                "size-2 rounded-full bg-current",
                meta.colorClassName,
              )}
            />
          ),
          title: meta.name || "Unsorted",
          href,
          value: meta.total,
        };
      }),
    [sortedGroupEntries, groupBy, queryParams, searchParamsObj],
  );

  const maxGroupTotal = useMemo(
    () =>
      sortedGroupEntries.length > 0
        ? Math.max(...sortedGroupEntries.map(([, meta]) => meta.total))
        : 0,
    [sortedGroupEntries],
  );

  return (
    <div className="space-y-4 pt-4 sm:pt-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 px-4 md:flex-row md:items-center md:justify-between md:px-0">
          <div className="flex w-full flex-col gap-2 md:w-fit md:flex-row md:items-center">
            <Filter.Select
              className="h-9 w-full md:w-fit"
              filters={filters}
              activeFilters={activeFilters}
              onSelect={onSelect}
              onRemove={onRemove}
            />
            <SimpleDateRangePicker
              presets={["7d", "30d", "90d", "1y", "mtd", "qtd", "ytd"]}
              values={{ start, end, interval }}
              className="h-9 w-full md:w-fit"
            />
          </div>
          <ToggleGroup
            options={[
              { value: "folderId", label: "Folder" },
              { value: "domain", label: "Domain" },
            ]}
            selected={groupBy}
            selectAction={(id) => queryParams({ set: { groupBy: id } })}
            className="w-full rounded-lg border-transparent bg-neutral-100 p-0.5 md:w-fit"
            optionClassName="flex-1 justify-center text-xs text-neutral-800 data-[selected=true]:text-neutral-800 px-3 sm:px-5 py-2 leading-none"
            indicatorClassName="bg-white border-neutral-200 rounded-md"
          />
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
      <div
        className={cn("h-64 transition-opacity", isValidating && "opacity-50")}
      >
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
                  colorClassName: groupsMeta[group.id]?.colorClassName,
                  isActive: true,
                })) ?? []),
              ]}
              tooltipClassName="p-0 overflow-hidden max-w-64"
              onHoverDateChange={handleHoverDateChange}
              tooltipContent={(d) => {
                const topGroups = usage?.[0]?.groups
                  ?.filter((group) => (d.values[group.id] ?? 0) > 0)
                  .sort((a, b) => (d.values[b.id] ?? 0) - (d.values[a.id] ?? 0))
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
                      <div className="border-border-subtle relative grid grid-cols-[minmax(0,1fr),min-content] gap-x-6 gap-y-2 overflow-hidden border-t px-4 py-3 text-xs">
                        {topGroups?.map((group) => {
                          const value = d.values[group.id];
                          if (!value) return null;

                          return (
                            <Fragment key={group.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className={cn(
                                    "size-2 shrink-0 rounded-full bg-current",
                                    groupsMeta[group.id]?.colorClassName,
                                  )}
                                />
                                <span
                                  className={cn(
                                    "min-w-0 truncate text-neutral-600",
                                    !group.name && "text-content-subtle",
                                  )}
                                >
                                  {group.name || "Unsorted"}
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
              <Bars />
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

      <div className="relative">
        <div
          className={cn(
            "flex flex-col transition-opacity",
            isValidating && "opacity-50",
          )}
        >
          <NumberFlowGroup>
            {sortedGroupEntries.length > 0 ? (
              <>
                {sortedGroupEntries.slice(0, 12).map(([id, meta]) => {
                  const hoveredMeta = deferredHoveredGroupsMeta?.[id];
                  const displayTotal = hoveredMeta?.total ?? meta.total;

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => queryParams({ set: { [groupBy]: id } })}
                      disabled={!id}
                      className="flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-xs font-medium enabled:hover:bg-black/[0.03] enabled:active:bg-black/5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "size-2 rounded-full bg-current",
                            meta.colorClassName,
                          )}
                        />
                        <span
                          className={cn(
                            "text-content-emphasis",
                            !meta.name && "text-content-subtle",
                          )}
                        >
                          {meta.name || "Unsorted"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 tabular-nums">
                        <NumberFlow
                          value={displayTotal}
                          className="text-content-default text-right font-medium"
                        />
                        {usage && (
                          <span className="text-content-muted min-w-12 text-right font-medium">
                            <NumberFlow
                              value={
                                (displayTotal /
                                  ((deferredHoveredTotalUsage ?? totalUsage) ||
                                    1)) *
                                100
                              }
                              format={{ maximumFractionDigits: 0 }}
                            />
                            %
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                {loading ? (
                  [...Array(3)].map((_, idx) => (
                    <div
                      key={idx}
                      className="flex animate-pulse items-center justify-between gap-4 px-3 py-2 text-xs font-medium"
                    >
                      <div className="flex items-center gap-2">
                        <div className="size-2 rounded-full bg-neutral-200" />
                        <div className="h-4 w-32 min-w-0 rounded-md bg-neutral-200" />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-8 rounded-md bg-neutral-200" />
                        <div className="h-4 w-6 rounded-md bg-neutral-200" />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-content-subtle flex size-full items-center justify-center py-5 text-sm">
                    Failed to load usage data
                  </p>
                )}
              </>
            )}
          </NumberFlowGroup>
        </div>

        {hasMoreGroups && (
          <div className="absolute bottom-0 left-0 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-gradient-to-t from-white" />
            <button
              type="button"
              onClick={() => setShowGroupsModal(true)}
              className="z-10 mx-auto rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-sm text-neutral-950 hover:bg-neutral-100 active:border-neutral-300"
            >
              View all
            </button>
          </div>
        )}
      </div>

      {hasMoreGroups && (
        <Modal showModal={showGroupsModal} setShowModal={setShowGroupsModal}>
          <div className="w-full max-w-md bg-white">
            <div className="border-b border-neutral-200 px-5 py-4">
              <h3 className="text-sm font-semibold text-neutral-900">
                Usage breakdown by {barListTabLabel.toLowerCase()}
              </h3>
            </div>
            <div className="max-h-[70vh] overflow-hidden">
              <BarList
                tab={barListTabLabel.toLowerCase()}
                unit={activeResource}
                data={barListData}
                maxValue={maxGroupTotal}
                barBackground="bg-violet-100"
                hoverBackground="hover:bg-gradient-to-r hover:from-violet-50 hover:to-transparent hover:border-violet-500"
                setShowModal={setShowGroupsModal}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
