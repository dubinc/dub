"use client";

import useCommissionsBreakdown, {
  CommissionsBreakdownItem,
} from "@/lib/swr/use-commissions-breakdown";
import { AnalyticsLoadingSpinner } from "@/ui/analytics/analytics-loading-spinner";
import { BarList } from "@/ui/analytics/bar-list";
import { CommissionTypeIcon } from "@/ui/partners/comission-type-icon";
import { TabSelect, useRouterStuff } from "@dub/ui";
import {
  CircleCheck,
  CircleHalfDottedClock,
  Globe,
  Users6,
} from "@dub/ui/icons";
import { cn } from "@dub/utils";
import { ReactNode, useCallback, useMemo, useState } from "react";
import { CommissionStatusFilter } from "./commissions-status-selector";

const FILTER_PARAM_KEYS: Record<string, string> = {
  group: "groupId",
  location: "country",
  type: "type",
  customer: "customerId",
  country: "country",
};

const GROUPBY_MAP: Record<string, "type" | "group" | "country" | "customer"> = {
  group: "group",
  location: "country",
  type: "type",
  customer: "customer",
  country: "country",
};

const STATUS_LABELS: Record<CommissionStatusFilter, string> = {
  pending: "Pending",
  processed: "Processed",
  paid: "Paid",
};

const STATUS_ICONS: Record<CommissionStatusFilter, React.ElementType> = {
  pending: CircleHalfDottedClock,
  processed: CircleHalfDottedClock,
  paid: CircleCheck,
};

function mapBreakdownItem(
  item: CommissionsBreakdownItem,
  groupBy: "type" | "group" | "country" | "customer",
): { icon: ReactNode; title: string; filterValue: string; value: number } {
  let icon: ReactNode = null;

  if (groupBy === "type") {
    icon = (
      <CommissionTypeIcon
        type={item.key as "sale" | "custom" | "lead" | "click"}
      />
    );
  } else if (groupBy === "country") {
    icon = (
      <img
        alt={item.key}
        src={`https://hatscripts.github.io/circle-flags/flags/${item.key.toLowerCase()}.svg`}
        className="size-4 shrink-0"
      />
    );
  }

  return {
    icon,
    title: item.label,
    filterValue: item.key,
    value: item.earnings,
  };
}

function CommissionsCard({
  status,
  tabs,
  selectedTabId,
  onSelectTab,
  dataLength,
  expandLimit,
  isFilterActive,
  onClearFilter,
  children,
}: {
  status: CommissionStatusFilter;
  tabs: { id: string; label: string; icon: React.ElementType }[];
  selectedTabId: string;
  onSelectTab: (id: string) => void;
  dataLength?: number;
  expandLimit: number;
  isFilterActive?: boolean;
  onClearFilter?: () => void;
  children: (props: {
    limit: number;
    setShowModal: (show: boolean) => void;
  }) => ReactNode;
}) {
  const [showModal, setShowModal] = useState(false);
  void showModal;

  const showViewAll = (dataLength ?? 0) > expandLimit;
  const StatusIcon = STATUS_ICONS[status];

  return (
    <div className="group relative z-0 h-[400px] overflow-hidden rounded-lg border border-neutral-200 bg-white sm:rounded-xl">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4">
        <TabSelect
          options={tabs.map((t) => ({ id: t.id, label: t.label }))}
          selected={selectedTabId}
          onSelect={onSelectTab}
        />
        <div className="flex items-center gap-1 pr-2 text-neutral-500">
          <StatusIcon className="hidden h-4 w-4 sm:block" />
          <p className="text-xs uppercase">{STATUS_LABELS[status]}</p>
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
  );
}

// ---------------------------------------------------------------------------
// CommissionsBreakdownCards
// ---------------------------------------------------------------------------

export function CommissionsBreakdownCards({
  status,
  queryString,
}: {
  status: CommissionStatusFilter;
  queryString: string;
}) {
  const { queryParams, searchParams } = useRouterStuff();
  const [leftTab, setLeftTab] = useState("group");
  const [rightTab, setRightTab] = useState("type");

  const [leftSelectedItems, setLeftSelectedItems] = useState<string[]>([]);
  const [rightSelectedItems, setRightSelectedItems] = useState<string[]>([]);

  const handleLeftTabChange = useCallback((id: string) => {
    setLeftTab(id);
    setLeftSelectedItems([]);
  }, []);

  const handleRightTabChange = useCallback((id: string) => {
    setRightTab(id);
    setRightSelectedItems([]);
  }, []);

  const leftFilterParamKey = FILTER_PARAM_KEYS[leftTab] ?? null;
  const rightFilterParamKey = FILTER_PARAM_KEYS[rightTab] ?? null;

  const leftActiveFilterValues = useMemo(
    () =>
      leftFilterParamKey
        ? searchParams.get(leftFilterParamKey)?.split(",").filter(Boolean) ?? []
        : [],
    [leftFilterParamKey, searchParams],
  );
  const rightActiveFilterValues = useMemo(
    () =>
      rightFilterParamKey
        ? searchParams.get(rightFilterParamKey)?.split(",").filter(Boolean) ??
          []
        : [],
    [rightFilterParamKey, searchParams],
  );

  const isLeftFilterActive =
    !!leftFilterParamKey && searchParams.has(leftFilterParamKey);
  const isRightFilterActive =
    !!rightFilterParamKey && searchParams.has(rightFilterParamKey);

  const leftGroupBy = GROUPBY_MAP[leftTab];
  const rightGroupBy = GROUPBY_MAP[rightTab];

  const { data: leftRawData, isLoading: leftLoading } = useCommissionsBreakdown(
    {
      queryString,
      groupBy: leftGroupBy,
    },
  );

  const { data: rightRawData, isLoading: rightLoading } =
    useCommissionsBreakdown({ queryString, groupBy: rightGroupBy });

  const leftData = useMemo(
    () =>
      (leftRawData ?? []).map((item) => mapBreakdownItem(item, leftGroupBy)),
    [leftRawData, leftGroupBy],
  );
  const rightData = useMemo(
    () =>
      (rightRawData ?? []).map((item) => mapBreakdownItem(item, rightGroupBy)),
    [rightRawData, rightGroupBy],
  );

  const leftMaxValue = Math.max(0, ...leftData.map((d) => d.value));
  const rightMaxValue = Math.max(0, ...rightData.map((d) => d.value));

  const onLeftToggleFilter = useCallback(
    (val: string) =>
      setLeftSelectedItems((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
      ),
    [],
  );
  const onLeftApplyFilterValues = useCallback(
    (values: string[]) => {
      if (!leftFilterParamKey) return;
      if (values.length === 0) {
        queryParams({ del: leftFilterParamKey, scroll: false });
      } else {
        queryParams({
          set: { [leftFilterParamKey]: values.join(",") },
          scroll: false,
        });
      }
      setLeftSelectedItems([]);
    },
    [leftFilterParamKey, queryParams],
  );
  const onLeftClearFilter = useCallback(() => {
    setLeftSelectedItems([]);
    if (isLeftFilterActive && leftFilterParamKey)
      queryParams({ del: leftFilterParamKey, scroll: false });
  }, [isLeftFilterActive, leftFilterParamKey, queryParams]);

  const onRightToggleFilter = useCallback(
    (val: string) =>
      setRightSelectedItems((prev) =>
        prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
      ),
    [],
  );
  const onRightApplyFilterValues = useCallback(
    (values: string[]) => {
      if (!rightFilterParamKey) return;
      if (values.length === 0) {
        queryParams({ del: rightFilterParamKey, scroll: false });
      } else {
        queryParams({
          set: { [rightFilterParamKey]: values.join(",") },
          scroll: false,
        });
      }
      setRightSelectedItems([]);
    },
    [rightFilterParamKey, queryParams],
  );
  const onRightClearFilter = useCallback(() => {
    setRightSelectedItems([]);
    if (isRightFilterActive && rightFilterParamKey)
      queryParams({ del: rightFilterParamKey, scroll: false });
  }, [isRightFilterActive, rightFilterParamKey, queryParams]);

  const EXPAND_LIMIT = 8;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <CommissionsCard
        status={status}
        tabs={[
          { id: "group", label: "Partner Group", icon: Users6 },
          { id: "location", label: "Location", icon: Globe },
        ]}
        selectedTabId={leftTab}
        onSelectTab={handleLeftTabChange}
        dataLength={leftData.length}
        expandLimit={EXPAND_LIMIT}
        isFilterActive={isLeftFilterActive}
        onClearFilter={onLeftClearFilter}
      >
        {({ limit, setShowModal }) =>
          leftLoading ? (
            <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
              <AnalyticsLoadingSpinner />
            </div>
          ) : leftData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-neutral-600">No data available</p>
            </div>
          ) : (
            <BarList
              tab={leftTab}
              unit="commission"
              data={leftData}
              maxValue={leftMaxValue}
              barBackground="bg-orange-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
              filterSelectedBackground="bg-neutral-900"
              filterSelectedHoverBackground="hover:bg-neutral-700"
              filterHoverClass="bg-white border border-neutral-200"
              setShowModal={setShowModal}
              limit={limit}
              selectedFilterValues={leftSelectedItems}
              activeFilterValues={leftActiveFilterValues}
              onToggleFilter={onLeftToggleFilter}
              onClearFilter={onLeftClearFilter}
              onClearSelection={() => setLeftSelectedItems([])}
              onApplyFilterValues={
                leftFilterParamKey ? onLeftApplyFilterValues : undefined
              }
              onRowFilterItem={
                leftFilterParamKey
                  ? (val) => onLeftApplyFilterValues([val])
                  : undefined
              }
            />
          )
        }
      </CommissionsCard>

      <CommissionsCard
        status={status}
        tabs={[
          { id: "type", label: "Type", icon: Users6 },
          { id: "customer", label: "Customer", icon: Users6 },
          { id: "country", label: "Country", icon: Globe },
        ]}
        selectedTabId={rightTab}
        onSelectTab={handleRightTabChange}
        dataLength={rightData.length}
        expandLimit={EXPAND_LIMIT}
        isFilterActive={isRightFilterActive}
        onClearFilter={onRightClearFilter}
      >
        {({ limit, setShowModal }) =>
          rightLoading ? (
            <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
              <AnalyticsLoadingSpinner />
            </div>
          ) : rightData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-neutral-600">No data available</p>
            </div>
          ) : (
            <BarList
              tab={rightTab}
              unit="commission"
              data={rightData}
              maxValue={rightMaxValue}
              barBackground="bg-neutral-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-neutral-50 hover:to-transparent hover:border-neutral-300"
              filterSelectedBackground="bg-neutral-900"
              filterSelectedHoverBackground="hover:bg-neutral-700"
              filterHoverClass="bg-white border border-neutral-200"
              setShowModal={setShowModal}
              limit={limit}
              selectedFilterValues={rightSelectedItems}
              activeFilterValues={rightActiveFilterValues}
              onToggleFilter={onRightToggleFilter}
              onClearFilter={onRightClearFilter}
              onClearSelection={() => setRightSelectedItems([])}
              onApplyFilterValues={
                rightFilterParamKey ? onRightApplyFilterValues : undefined
              }
              onRowFilterItem={
                rightFilterParamKey
                  ? (val) => onRightApplyFilterValues([val])
                  : undefined
              }
            />
          )
        }
      </CommissionsCard>
    </div>
  );
}
