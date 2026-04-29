"use client";

import useCommissionsBreakdown, {
  CommissionsBreakdownItem,
} from "@/lib/swr/use-commissions-breakdown";
import useGroups from "@/lib/swr/use-groups";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { BarList } from "@/ui/analytics/bar-list";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { GroupColorCircle } from "@/ui/partners/groups/group-color-circle";
import { Modal, useRouterStuff } from "@dub/ui";
import { CircleCheck, CircleDotted, CircleHalfDottedClock } from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { CommissionStatusFilter } from "./commissions-status-selector";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processed: "Processed",
  paid: "Paid",
  all: "All",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  pending: CircleHalfDottedClock,
  processed: CircleHalfDottedClock,
  paid: CircleCheck,
  all: CircleDotted,
};

type BreakdownGroupBy = "type" | "groupId";

function mapBreakdownItem(
  item: CommissionsBreakdownItem,
  groupBy: BreakdownGroupBy,
  groupColorMap: Map<string, { color: string | null }>,
) {
  const icon =
    groupBy === "type" ? (
      <CommissionTypeIcon
        type={item.key as "sale" | "custom" | "lead" | "click"}
      />
    ) : (
      <GroupColorCircle
        group={{ color: groupColorMap.get(item.key)?.color ?? null }}
      />
    );

  return {
    icon,
    title: item.label,
    filterValue: item.key,
    value: item.earnings,
  };
}

function useUrlListFilter(paramKey: string) {
  const { queryParams, searchParams } = useRouterStuff();
  const [selected, setSelected] = useState<string[]>([]);

  const activeFilterValues = useMemo(
    () => searchParams.get(paramKey)?.split(",").filter(Boolean) ?? [],
    [paramKey, searchParams],
  );
  const isFilterActive = searchParams.has(paramKey);

  const applyFilterValues = useCallback(
    (values: string[]) => {
      if (values.length === 0) {
        queryParams({ del: paramKey, scroll: false });
      } else {
        queryParams({ set: { [paramKey]: values.join(",") }, scroll: false });
      }
      setSelected([]);
    },
    [paramKey, queryParams],
  );

  const clearFilter = useCallback(() => {
    setSelected([]);
    if (searchParams.has(paramKey)) {
      queryParams({ del: paramKey, scroll: false });
    }
  }, [paramKey, queryParams, searchParams]);

  const toggleFilter = useCallback((val: string) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  return {
    selected,
    activeFilterValues,
    isFilterActive,
    applyFilterValues,
    clearFilter,
    toggleFilter,
    clearSelection: () => setSelected([]),
  };
}

function BreakdownCardShell({
  status,
  title,
  dataLength,
  expandLimit,
  isFilterActive,
  onClearFilter,
  children,
}: {
  status: CommissionStatusFilter;
  title: string;
  dataLength?: number;
  expandLimit: number;
  isFilterActive?: boolean;
  onClearFilter?: () => void;
  children: (props: {
    limit?: number;
    setShowModal: (show: boolean) => void;
  }) => ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  const showViewAll = (dataLength ?? 0) > expandLimit;
  const statusKey = status ?? "all";
  const StatusIcon = STATUS_ICONS[statusKey];

  return (
    <>
      <Modal
        showModal={showModal}
        setShowModal={setShowModal}
        className="max-w-lg px-0"
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-1 text-neutral-500">
            <StatusIcon className="h-4 w-4" />
            <p className="text-xs uppercase">{STATUS_LABELS[statusKey]}</p>
          </div>
        </div>
        {children({ setShowModal })}
      </Modal>

      <div className="group relative z-0 h-[400px] overflow-hidden rounded-lg border border-neutral-200 bg-white sm:rounded-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4">
          <p className="py-3 text-sm font-medium text-neutral-900">{title}</p>
          <div className="flex items-center gap-1 pr-2 text-neutral-500">
            <StatusIcon className="hidden h-4 w-4 sm:block" />
            <p className="text-xs uppercase">{STATUS_LABELS[statusKey]}</p>
          </div>
        </div>

        <div className="py-4">
          {children({ limit: expandLimit, setShowModal })}
        </div>

        {(showViewAll || isFilterActive) && (
          <div className="absolute bottom-0 left-0 z-10 flex w-full items-end">
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-full bg-gradient-to-t from-white" />
            <div className="relative flex w-full items-center justify-center gap-2 py-4">
              <button
                type="button"
                onClick={() => setShowModal(true)}
                className={cn(
                  "h-8 w-fit rounded-lg px-3 text-sm transition-colors",
                  isFilterActive
                    ? "border-black bg-black text-white hover:bg-neutral-800"
                    : "border border-neutral-200 bg-white text-neutral-950 hover:bg-neutral-100 active:border-neutral-300",
                )}
              >
                View All
              </button>
              {isFilterActive && onClearFilter && (
                <button
                  type="button"
                  onClick={onClearFilter}
                  className="h-8 w-fit rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-600 transition-colors hover:bg-neutral-50 active:border-neutral-300"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

const EXPAND_LIMIT = 8;

const BAR_LIST_SHARED = {
  unit: "sales" as const,
  filterSelectedBackground: "bg-neutral-900",
  filterSelectedHoverBackground: "hover:bg-neutral-700",
  filterHoverClass: "bg-white border border-neutral-200",
};

function BreakdownBarPanel({
  status,
  title,
  tab,
  filter,
  rawItems,
  loading,
  groupColorMap,
  barBackground,
  hoverBackground,
}: {
  status: CommissionStatusFilter;
  title: string;
  tab: BreakdownGroupBy;
  filter: ReturnType<typeof useUrlListFilter>;
  rawItems: CommissionsBreakdownItem[] | undefined;
  loading: boolean;
  groupColorMap: Map<string, { color: string | null }>;
  barBackground: string;
  hoverBackground: string;
}) {
  const data = useMemo(
    () =>
      (rawItems ?? []).map((item) =>
        mapBreakdownItem(item, tab, groupColorMap),
      ),
    [rawItems, tab, groupColorMap],
  );
  const maxValue = Math.max(0, ...data.map((d) => d.value));

  return (
    <BreakdownCardShell
      status={status}
      title={title}
      dataLength={data.length}
      expandLimit={EXPAND_LIMIT}
      isFilterActive={filter.isFilterActive}
      onClearFilter={filter.clearFilter}
    >
      {({ limit, setShowModal }) =>
        loading ? (
          <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
            <AnalyticsLoadingSpinner />
          </div>
        ) : data.length === 0 ? (
          <div className="flex h-[300px] items-center justify-center">
            <p className="text-sm text-neutral-600">No data available</p>
          </div>
        ) : (
          <BarList
            tab={tab}
            {...BAR_LIST_SHARED}
            data={data}
            maxValue={maxValue}
            barBackground={barBackground}
            hoverBackground={hoverBackground}
            setShowModal={setShowModal}
            limit={limit}
            selectedFilterValues={filter.selected}
            activeFilterValues={filter.activeFilterValues}
            onToggleFilter={filter.toggleFilter}
            onClearFilter={filter.clearFilter}
            onClearSelection={filter.clearSelection}
            onApplyFilterValues={filter.applyFilterValues}
            onRowFilterItem={(val) => filter.applyFilterValues([val])}
          />
        )
      }
    </BreakdownCardShell>
  );
}

export function CommissionsBreakdownCards({
  status,
  queryString,
}: {
  status: CommissionStatusFilter;
  queryString: string;
}) {
  const groupFilter = useUrlListFilter("groupId");
  const typeFilter = useUrlListFilter("type");

  const { groups } = useGroups();
  const groupColorMap = useMemo(() => {
    const map = new Map<string, { color: string | null }>();
    groups?.forEach((g) => map.set(g.id, { color: g.color ?? null }));
    return map;
  }, [groups]);

  const { data: groupRows, isLoading: groupLoading } = useCommissionsBreakdown({
    queryString,
    groupBy: "groupId",
  });
  const { data: typeRows, isLoading: typeLoading } = useCommissionsBreakdown({
    queryString,
    groupBy: "type",
  });

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <BreakdownBarPanel
        status={status}
        title="Partner Group"
        tab="groupId"
        filter={groupFilter}
        rawItems={groupRows}
        loading={groupLoading}
        groupColorMap={groupColorMap}
        barBackground="bg-orange-100"
        hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
      />
      <BreakdownBarPanel
        status={status}
        title="Type"
        tab="type"
        filter={typeFilter}
        rawItems={typeRows}
        loading={typeLoading}
        groupColorMap={groupColorMap}
        barBackground="bg-neutral-100"
        hoverBackground="hover:bg-gradient-to-r hover:from-neutral-50 hover:to-transparent hover:border-neutral-300"
      />
    </div>
  );
}
