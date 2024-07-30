import { LinkLogo, useRouterStuff } from "@dub/ui";
import { getApexDomain } from "@dub/utils";
import { useContext } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function TopLinks() {
  const { queryParams } = useRouterStuff();

  const { selectedTab, domain, key } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? "amount" : "count";
  const showUrls = domain && key;

  const data = useAnalyticsFilterOption({
    groupBy: `top_${showUrls ? "urls" : "links"}`,
  });

  return (
    <AnalyticsCard
      tabs={
        showUrls
          ? [{ id: "urls", label: "URLs" }]
          : [{ id: "links", label: "Links" }]
      }
      expandLimit={8}
      hasMore={(data?.length ?? 0) > 8}
      selectedTabId={showUrls ? "urls" : "links"}
    >
      {({ limit, setShowModal }) =>
        data ? (
          data.length > 0 ? (
            <BarList
              tab={showUrls ? "url" : "link"}
              data={
                data
                  ?.map((d) => ({
                    icon: (
                      <LinkLogo
                        apexDomain={getApexDomain(d.url)}
                        className="h-5 w-5 sm:h-5 sm:w-5"
                      />
                    ),
                    title:
                      !showUrls && d["shortLink"]
                        ? d["shortLink"].replace(/^https?:\/\//, "")
                        : d.url?.replace(/^https?:\/\//, ""),
                    href: queryParams({
                      set: {
                        ...(!showUrls
                          ? { domain: d.domain, key: d.key || "_root" }
                          : {
                              url: d.url,
                            }),
                      },
                      getNewPath: true,
                    }) as string,
                    value: d[dataKey] || 0,
                    ...(!showUrls && { linkData: d }),
                  }))
                  ?.sort((a, b) => b.value - a.value) || []
              }
              isCurrency={dataKey === "amount"}
              maxValue={Math.max(...data?.map((d) => d[dataKey] ?? 0)) ?? 0}
              barBackground="bg-orange-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
              setShowModal={setShowModal}
              {...(limit && { limit })}
            />
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-sm text-gray-600">No data available</p>
            </div>
          )
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <AnalyticsLoadingSpinner />
          </div>
        )
      }
    </AnalyticsCard>
  );
}
