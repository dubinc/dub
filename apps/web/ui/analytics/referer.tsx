import { SINGULAR_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { BlurImage, useRouterStuff } from "@dub/ui";
import { ReferredVia } from "@dub/ui/icons";
import { getApexDomain, GOOGLE_FAVICON_URL } from "@dub/utils";
import { Link2 } from "lucide-react";
import { useContext, useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function Referer() {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<"referers" | "referer_urls">("referers");
  const { data, loading } = useAnalyticsFilterOption(tab);
  const singularTabName = SINGULAR_ANALYTICS_ENDPOINTS[tab];

  return (
    <AnalyticsCard
      tabs={[
        { id: "referers", label: "Referrers", icon: ReferredVia },
        { id: "referer_urls", label: "Referrer URLs", icon: ReferredVia },
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
              tab="Referrer"
              data={
                data
                  ?.map((d) => ({
                    icon:
                      d[singularTabName] === "(direct)" ? (
                        <Link2 className="h-4 w-4" />
                      ) : (
                        <BlurImage
                          src={`${GOOGLE_FAVICON_URL}${
                            tab === "referers"
                              ? d[singularTabName]
                              : getApexDomain(d[singularTabName])
                          }`}
                          alt={d[singularTabName]}
                          width={20}
                          height={20}
                          className="h-4 w-4 rounded-full"
                        />
                      ),
                    title: d[singularTabName],
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
              barBackground="bg-red-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-red-50 hover:to-transparent hover:border-red-500"
              setShowModal={setShowModal}
              {...(limit && { limit })}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">No data available</p>
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
