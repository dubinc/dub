import { SINGULAR_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { useRouterStuff } from "@dub/ui";
import {
  FlagWavy,
  LocationPin,
  MapPosition,
  OfficeBuilding,
} from "@dub/ui/icons";
import { CONTINENTS, COUNTRIES, REGIONS } from "@dub/utils";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import { BarList } from "./bar-list";
import { ContinentIcon } from "./continent-icon";
import { useAnalyticsFilterOption } from "./utils";

export function LocationSection() {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<
    "countries" | "cities" | "regions" | "continents"
  >("countries");

  const { data } = useAnalyticsFilterOption(tab);
  const { data: allData } = useAnalyticsFilterOption(tab, {
    omitGroupByFilterKey: true,
  });
  const singularTabName = SINGULAR_ANALYTICS_ENDPOINTS[tab];

  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    setSelectedItems([]);
  }, [tab]);

  const onToggleFilter = useCallback((val: string) => {
    setSelectedItems((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val],
    );
  }, []);

  const onApplyFilterValues = useCallback(
    (values: string[]) => {
      if (values.length === 0) {
        queryParams({ del: singularTabName });
      } else {
        queryParams({ set: { [singularTabName]: values.join(",") } });
      }
      setSelectedItems([]);
    },
    [singularTabName, queryParams],
  );

  const isFilterActive = searchParams.has(singularTabName);
  const activeFilterValues = useMemo(
    () => searchParams.get(singularTabName)?.split(",") ?? [],
    [singularTabName, searchParams],
  );

  const onClearFilter = useCallback(() => {
    setSelectedItems([]);
    if (isFilterActive) queryParams({ del: singularTabName });
  }, [singularTabName, queryParams, isFilterActive]);

  return (
    <AnalyticsCard
      tabs={[
        { id: "countries", label: "Countries", icon: FlagWavy },
        { id: "cities", label: "Cities", icon: OfficeBuilding },
        { id: "regions", label: "Regions", icon: LocationPin },
        { id: "continents", label: "Continents", icon: MapPosition },
      ]}
      selectedTabId={tab}
      onSelectTab={setTab}
      expandLimit={8}
      dataLength={data?.length}
      isFilterActive={isFilterActive}
      onClearFilter={onClearFilter}
    >
      {({ limit, setShowModal }) =>
        data ? (
          data.length > 0 ? (
            <BarList
              tab={singularTabName}
              data={
                data
                  ?.map((d) => ({
                    icon:
                      tab === "continents" ? (
                        <ContinentIcon
                          display={d.continent}
                          className="size-4 rounded-full border border-cyan-500"
                        />
                      ) : (
                        <img
                          alt={d.country}
                          src={`https://hatscripts.github.io/circle-flags/flags/${d.country.toLowerCase()}.svg`}
                          className="size-4 shrink-0"
                        />
                      ),
                    title:
                      tab === "continents"
                        ? CONTINENTS[d.continent]
                        : tab === "countries"
                          ? COUNTRIES[d.country]
                          : `${tab === "cities" ? `${d.city}, ` : ""}${
                              REGIONS[d.region] ||
                              (d.region.endsWith("-Unknown")
                                ? COUNTRIES[d.country]
                                : d.region.split("-")[1])
                            }`,
                    filterValue: d[singularTabName],
                    value: d[dataKey] || 0,
                  }))
                  ?.sort((a, b) => b.value - a.value) || []
              }
              allData={allData
                ?.map((d) => ({
                  icon:
                    tab === "continents" ? (
                      <ContinentIcon
                        display={d.continent}
                        className="size-4 rounded-full border border-cyan-500"
                      />
                    ) : (
                      <img
                        alt={d.country}
                        src={`https://hatscripts.github.io/circle-flags/flags/${d.country.toLowerCase()}.svg`}
                        className="size-4 shrink-0"
                      />
                    ),
                  title:
                    tab === "continents"
                      ? CONTINENTS[d.continent]
                      : tab === "countries"
                        ? COUNTRIES[d.country]
                        : `${tab === "cities" ? `${d.city}, ` : ""}${
                            REGIONS[d.region] ||
                            (d.region.endsWith("-Unknown")
                              ? COUNTRIES[d.country]
                              : d.region.split("-")[1])
                          }`,
                  filterValue: d[singularTabName],
                  value: d[dataKey] || 0,
                }))
                ?.sort((a, b) => b.value - a.value)}
              unit={selectedTab}
              maxValue={Math.max(...data.map((d) => d[dataKey] ?? 0)) ?? 0}
              barBackground="bg-blue-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-blue-500"
              filterSelectedBackground="bg-blue-600"
              filterSelectedHoverBackground="hover:bg-blue-700"
              filterHoverClass="bg-white border border-blue-200"
              setShowModal={setShowModal}
              selectedFilterValues={selectedItems}
              activeFilterValues={activeFilterValues}
              onToggleFilter={onToggleFilter}
              onClearFilter={onClearFilter}
              onClearSelection={() => setSelectedItems([])}
              onApplyFilterValues={onApplyFilterValues}
              onImmediateFilter={(val) => onApplyFilterValues([val])}
              {...(limit && { limit })}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-neutral-600">No data available</p>
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
            <AnalyticsLoadingSpinner />
          </div>
        )
      }
    </AnalyticsCard>
  );
}
