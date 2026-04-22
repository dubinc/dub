"use client";

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
import {
  CommissionStatusFilter,
  MOCK_COUNTRY_BREAKDOWN,
  MOCK_CUSTOMER_BREAKDOWN,
  MOCK_GROUP_BREAKDOWN,
  MOCK_LOCATION_BREAKDOWN,
  MOCK_TYPE_BREAKDOWN,
} from "./commissions-mock-data";

const FILTER_PARAM_KEYS: Record<string, string> = {
  group: "groupId",
  location: "country",
  type: "type",
  customer: "customerId",
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
}: {
  status: CommissionStatusFilter;
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
    if (isLeftFilterActive && leftFilterParamKey) {
      queryParams({ del: leftFilterParamKey, scroll: false });
    }
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
    if (isRightFilterActive && rightFilterParamKey) {
      queryParams({ del: rightFilterParamKey, scroll: false });
    }
  }, [isRightFilterActive, rightFilterParamKey, queryParams]);

  const groupData = MOCK_GROUP_BREAKDOWN.map((item) => ({
    icon: (
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: item.color }}
      />
    ) as ReactNode,
    title: item.label,
    filterValue: item.label,
    value: item.value,
  }));

  const locationData = MOCK_LOCATION_BREAKDOWN.map((item) => ({
    icon: (
      <img
        alt={`${item.countryCode} flag`}
        src={`https://hatscripts.github.io/circle-flags/flags/${item.countryCode}.svg`}
        className="size-4 shrink-0"
      />
    ) as ReactNode,
    title: item.label,
    filterValue: item.countryCode,
    value: item.value,
  }));

  const typeData = MOCK_TYPE_BREAKDOWN.map((item) => ({
    icon: (
      <CommissionTypeIcon
        type={item.type as "sale" | "custom" | "lead" | "click"}
      />
    ) as ReactNode,
    title: item.label,
    filterValue: item.type,
    value: item.value,
  }));

  const customerData = MOCK_CUSTOMER_BREAKDOWN.map((item) => ({
    icon: null as ReactNode,
    title: item.label,
    filterValue: item.label,
    value: item.value,
  }));

  const countryData = MOCK_COUNTRY_BREAKDOWN.map((item) => ({
    icon: (
      <img
        alt={`${item.countryCode} flag`}
        src={`https://hatscripts.github.io/circle-flags/flags/${item.countryCode}.svg`}
        className="size-4 shrink-0"
      />
    ) as ReactNode,
    title: item.label,
    filterValue: item.countryCode,
    value: item.value,
  }));

  const leftActiveData = leftTab === "group" ? groupData : locationData;
  const rightActiveData =
    rightTab === "type"
      ? typeData
      : rightTab === "customer"
        ? customerData
        : countryData;

  const leftMaxValue = Math.max(...leftActiveData.map((d) => d.value));
  const rightMaxValue = Math.max(...rightActiveData.map((d) => d.value));

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
        dataLength={leftActiveData.length}
        expandLimit={EXPAND_LIMIT}
        isFilterActive={isLeftFilterActive}
        onClearFilter={onLeftClearFilter}
      >
        {({ limit, setShowModal }) => (
          <BarList
            tab={leftTab}
            unit="commission"
            data={leftActiveData}
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
        )}
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
        dataLength={rightActiveData.length}
        expandLimit={EXPAND_LIMIT}
        isFilterActive={isRightFilterActive}
        onClearFilter={onRightClearFilter}
      >
        {({ limit, setShowModal }) => (
          <BarList
            tab={rightTab}
            unit="commission"
            data={rightActiveData}
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
        )}
      </CommissionsCard>
    </div>
  );
}
