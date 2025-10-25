import useDomains from "@/lib/swr/use-domains";
import useFolders from "@/lib/swr/use-folders";
import useUsage from "@/lib/swr/use-usage";
import { FolderIcon } from "@/ui/folders/folder-icon";
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
import { LinearGradient } from "@visx/gradient";
import { ComponentProps, Fragment, useEffect, useMemo } from "react";

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

  const { usage, loading, activeResource } = useUsage();

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
      usage?.map(({ date, value }) => ({
        date: new Date(date),
        values: { usage: value },
      })),
    [usage, activeResource],
  );

  const allZeroes = useMemo(
    () => chartData?.every(({ values }) => values.usage === 0),
    [chartData],
  );

  return (
    <div
      className={cn(
        "space-y-4 pt-6 md:pt-8",
        activeResource === "links" && "pt-4 md:pt-4",
      )}
    >
      {/* Filters - only show when resource is "links" */}
      {activeResource === "links" && (
        <div className="flex flex-col gap-3">
          <Filter.Select
            className="w-full md:w-fit"
            filters={filters}
            activeFilters={activeFilters}
            onSelect={onSelect}
            onRemove={onRemove}
          />
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
      )}

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
                  isActive: true,
                },
              ]}
              tooltipClassName="p-0"
              tooltipContent={(d) => {
                return (
                  <>
                    <p className="border-b border-neutral-200 px-4 py-3 text-sm text-neutral-900">
                      {formatDate(d.date)}
                    </p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 px-4 py-3 text-sm">
                      <Fragment key={activeResource}>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-sm bg-violet-500 shadow-[inset_0_0_0_1px_#0003]" />
                          <p className="capitalize text-neutral-600">
                            {activeResource}
                          </p>
                        </div>
                        <p className="text-right font-medium text-neutral-900">
                          {nFormatter(d.values.usage, { full: true })}
                        </p>
                      </Fragment>
                    </div>
                  </>
                );
              }}
            >
              <LinearGradient id="usage-bar-gradient">
                <stop stopColor="#2563eb" stopOpacity={1} offset="20%" />
                <stop stopColor="#3b82f6" stopOpacity={0.9} offset="100%" />
              </LinearGradient>
              <XAxis highlightLast={false} />
              <YAxis showGridLines tickFormat={nFormatter} />
              <Bars
                seriesStyles={[
                  {
                    id: "usage",
                    barFill: "url(#usage-bar-gradient)",
                  },
                ]}
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
    </div>
  );
}
