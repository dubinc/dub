import { SINGULAR_ANALYTICS_ENDPOINTS } from "@/lib/analytics/constants";
import { UTM_TAGS_PLURAL, UTM_TAGS_PLURAL_LIST } from "@/lib/zod/schemas/utm";
import { BlurImage, useRouterStuff, UTM_PARAMETERS } from "@dub/ui";
import { Note, ReferredVia } from "@dub/ui/icons";
import { getApexDomain, GOOGLE_FAVICON_URL } from "@dub/utils";
import { Link2 } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function Referer() {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<"referers" | "utms">("referers");
  const [utmTag, setUtmTag] = useState<UTM_TAGS_PLURAL>("utm_sources");
  const [refererType, setRefererType] = useState<"referers" | "referer_urls">(
    "referers",
  );

  const { data } = useAnalyticsFilterOption({
    groupBy: tab === "utms" ? utmTag : refererType,
  });

  const singularTabName =
    SINGULAR_ANALYTICS_ENDPOINTS[tab === "utms" ? utmTag : refererType];

  const { icon: UTMTagIcon } = UTM_PARAMETERS.find(
    (p) => p.key === utmTag.slice(0, -1),
  )!;

  const subTabProps = useMemo(() => {
    return (
      {
        utms: {
          subTabs: UTM_TAGS_PLURAL_LIST.map((u) => ({
            id: u,
            label: SINGULAR_ANALYTICS_ENDPOINTS[u].replace("utm_", ""),
          })),
          selectedSubTabId: utmTag,
          onSelectSubTab: setUtmTag,
        },
        referers: {
          subTabs: [
            { id: "referers", label: "Domain" },
            { id: "referer_urls", label: "URL" },
          ],
          selectedSubTabId: refererType,
          onSelectSubTab: setRefererType,
        },
      }[tab] ?? {}
    );
  }, [tab, utmTag, refererType]);

  return (
    <AnalyticsCard
      tabs={[
        { id: "referers", label: "Referrers", icon: ReferredVia },
        { id: "utms", label: "UTM Parameters", icon: Note },
      ]}
      selectedTabId={tab}
      onSelectTab={setTab}
      {...subTabProps}
      expandLimit={8}
      hasMore={(data?.length ?? 0) > 8}
    >
      {({ limit, setShowModal }) => (
        <>
          {data ? (
            data.length > 0 ? (
              <BarList
                tab={tab === "referers" ? "Referrer" : "UTM Parameter"}
                data={
                  data
                    ?.map((d) => ({
                      icon:
                        tab === "utms" ? (
                          <UTMTagIcon />
                        ) : d[singularTabName] === "(direct)" ? (
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
                <p className="text-sm text-neutral-600">No data available</p>
              </div>
            )
          ) : (
            <div className="absolute inset-0 flex h-[300px] w-full items-center justify-center bg-white/50">
              <AnalyticsLoadingSpinner />
            </div>
          )}
        </>
      )}
    </AnalyticsCard>
  );
}
