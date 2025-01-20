import { SINGULAR_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { useRouterStuff } from "@dub/ui";
import {
  FlagWavy,
  LocationPin,
  MapPosition,
  OfficeBuilding,
} from "@dub/ui/icons";
import { CONTINENTS, COUNTRIES, REGIONS } from "@dub/utils";
import { useTranslations } from "next-intl";
import { useContext, useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import ContinentIcon from "./continent-icon";
import { useAnalyticsFilterOption } from "./utils";

export default function Locations() {
  const t = useTranslations("../ui/analytics");

  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<
    "countries" | "cities" | "continents" | "regions"
  >("countries");

  const { data, loading } = useAnalyticsFilterOption(tab);
  const singularTabName = SINGULAR_ANALYTICS_ENDPOINTS[tab];

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
      hasMore={(data?.length ?? 0) > 8}
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
                          className="size-3"
                        />
                      ) : (
                        <img
                          alt={d.country}
                          src={`https://flag.vercel.app/m/${d.country}.svg`}
                          className="h-3 w-5"
                        />
                      ),
                    title:
                      tab === "continents"
                        ? CONTINENTS[d.continent]
                        : tab === "countries"
                          ? COUNTRIES[d.country]
                          : tab === "regions"
                            ? REGIONS[d.region] || d.region.split("-")[1]
                            : d.city,
                    href: queryParams({
                      ...(searchParams.has(singularTabName)
                        ? { del: singularTabName }
                        : {
                            set: {
                              [singularTabName]: d[singularTabName],
                            },
                          }),
                      getNewPath: true,
                    }) as string,
                    value: d[dataKey] || 0,
                  }))
                  ?.sort((a, b) => b.value - a.value) || []
              }
              unit={selectedTab}
              maxValue={Math.max(...data?.map((d) => d[dataKey] ?? 0)) ?? 0}
              barBackground="bg-blue-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-blue-50 hover:to-transparent hover:border-blue-500"
              setShowModal={setShowModal}
              {...(limit && { limit })}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">{t("no-data-available")}</p>
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
