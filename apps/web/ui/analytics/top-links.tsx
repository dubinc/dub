import { useWorkspacePreferences } from "@/lib/swr/use-workspace-preferences";
import { LinkLogo, useRouterStuff } from "@dub/ui";
import { Globe, Hyperlink } from "@dub/ui/icons";
import { getApexDomain } from "@dub/utils";
import { useCallback, useContext, useState } from "react";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import BarList from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

export default function TopLinks({
  filterLinks = true,
}: {
  filterLinks?: boolean;
}) {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit } = useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<"links" | "urls">("links");
  const { data } = useAnalyticsFilterOption({
    groupBy: `top_${tab}`,
  });

  const [persisted] = useWorkspacePreferences("linksDisplay");

  const shortLinkTitle = useCallback(
    (d: { url?: string; title?: string; shortLink?: string }) => {
      if (tab === "urls") {
        return d.url || "Unknown";
      }

      const displayProperties = persisted?.displayProperties;

      if (displayProperties?.includes("title") && d.title) {
        return d.title;
      }

      return d.shortLink || "Unknown";
    },
    [persisted, tab],
  );

  return (
    <AnalyticsCard
      tabs={[
        { id: "links", label: "Short Links", icon: Hyperlink },
        { id: "urls", label: "Destination URLs", icon: Globe },
      ]}
      expandLimit={8}
      hasMore={(data?.length ?? 0) > 8}
      selectedTabId={tab}
      onSelectTab={setTab}
    >
      {({ limit, setShowModal }) =>
        data ? (
          data.length > 0 ? (
            <BarList
              tab={tab}
              data={
                data
                  ?.map((d) => ({
                    icon: (
                      <LinkLogo
                        apexDomain={getApexDomain(d.url)}
                        className="size-5 sm:size-5"
                      />
                    ),
                    title: shortLinkTitle(d as any),
                    // TODO: simplify this once we switch from domain+key to linkId
                    href: filterLinks
                      ? (queryParams({
                          ...((tab === "links" &&
                            searchParams.has("domain") &&
                            searchParams.has("key")) ||
                          (tab === "urls" && searchParams.has("url"))
                            ? {
                                del:
                                  tab === "links" ? ["domain", "key"] : "url",
                              }
                            : {
                                set: {
                                  ...(tab === "links"
                                    ? {
                                        domain: d.domain,
                                        key: d.key || "_root",
                                      }
                                    : {
                                        url: d.url,
                                      }),
                                },
                              }),
                          getNewPath: true,
                        }) as string)
                      : undefined,
                    value: d[dataKey] || 0,
                    ...(tab === "links" && { linkData: d }),
                  }))
                  ?.sort((a, b) => b.value - a.value) || []
              }
              unit={selectedTab}
              maxValue={Math.max(...data?.map((d) => d[dataKey] ?? 0)) ?? 0}
              barBackground="bg-orange-100"
              hoverBackground="hover:bg-gradient-to-r hover:from-orange-50 hover:to-transparent hover:border-orange-500"
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
        )
      }
    </AnalyticsCard>
  );
}
