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
import { BarList } from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

type TabId = "referers" | "utms";
type RefererSubtab = "referers" | "referer_urls";
type Subtab = UTM_TAGS_PLURAL | RefererSubtab;

const TAB_CONFIG: Record<
  TabId,
  {
    subtabs: Subtab[];
    defaultSubtab: Subtab;
    getSubtabLabel: (subtab: Subtab) => string;
  }
> = {
  referers: {
    subtabs: ["referers", "referer_urls"],
    defaultSubtab: "referers",
    getSubtabLabel: (subtab) => (subtab === "referers" ? "Domain" : "URL"),
  },
  utms: {
    subtabs: [...UTM_TAGS_PLURAL_LIST] as Subtab[],
    defaultSubtab: "utm_sources" as Subtab,
    getSubtabLabel: (subtab) =>
      SINGULAR_ANALYTICS_ENDPOINTS[subtab as UTM_TAGS_PLURAL].replace(
        "utm_",
        "",
      ),
  },
};

export function ReferrersUTMs() {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<TabId>("referers");
  const [subtab, setSubtab] = useState<Subtab>(TAB_CONFIG[tab].defaultSubtab);

  // Reset subtab when tab changes to ensure it's valid for the new tab
  const handleTabChange = (newTab: TabId) => {
    setTab(newTab);
    setSubtab(TAB_CONFIG[newTab].defaultSubtab);
  };

  const { data } = useAnalyticsFilterOption({
    groupBy: subtab,
  });

  const singularTabName = SINGULAR_ANALYTICS_ENDPOINTS[subtab];

  const UTMTagIcon = useMemo(() => {
    if (tab === "utms") {
      return UTM_PARAMETERS.find(
        (p) => p.key === (subtab as UTM_TAGS_PLURAL).slice(0, -1),
      )?.icon;
    }
    return null;
  }, [tab, subtab]);

  const subTabProps = useMemo(() => {
    const config = TAB_CONFIG[tab];
    return {
      subTabs: config.subtabs.map((s) => ({
        id: s,
        label: config.getSubtabLabel(s),
      })),
      selectedSubTabId: subtab,
      onSelectSubTab: setSubtab,
    };
  }, [tab, subtab]);

  return (
    <AnalyticsCard
      tabs={[
        { id: "referers", label: "Referrers", icon: ReferredVia },
        { id: "utms", label: "UTM Parameters", icon: Note },
      ]}
      selectedTabId={tab}
      onSelectTab={handleTabChange}
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
                    ?.map((d) => {
                      const isUtmTab = tab === "utms";
                      const isDirect = d[singularTabName] === "(direct)";
                      const isRefererUrl = subtab === "referer_urls";

                      return {
                        icon:
                          isUtmTab && UTMTagIcon ? (
                            <UTMTagIcon />
                          ) : isDirect ? (
                            <Link2 className="h-4 w-4" />
                          ) : (
                            <BlurImage
                              src={`${GOOGLE_FAVICON_URL}${
                                isRefererUrl
                                  ? getApexDomain(d[singularTabName])
                                  : d[singularTabName]
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
                      };
                    })
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
