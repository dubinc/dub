import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { useWorkspacePreferences } from "@/lib/swr/use-workspace-preferences";
import { LinkLogo, useRouterStuff } from "@dub/ui";
import { Hyperlink, Users6 } from "@dub/ui/icons";
import { getApexDomain } from "@dub/utils";
import { useCallback, useContext, useMemo, useState } from "react";
import TagBadge from "../links/tag-badge";
import { GroupColorCircle } from "../partners/groups/group-color-circle";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import { BarList } from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

type TabId = "segments" | "links";
type SegmentsSubtab = "groups" | "tags";
type LinksSubtab = "short_links" | "destination_urls";
type Subtab = SegmentsSubtab | LinksSubtab;

const TAB_CONFIG: Record<
  TabId,
  {
    subtabs: Subtab[];
    defaultSubtab: Subtab;
    getSubtabLabel: (subtab: Subtab) => string;
    getGroupBy: (subtab: Subtab) => {
      groupBy: AnalyticsGroupByOptions;
    };
  }
> = {
  segments: {
    subtabs: ["groups", "tags"],
    defaultSubtab: "groups",
    getSubtabLabel: (subtab) => {
      if (subtab === "groups") return "Groups";
      return "Tags";
    },
    getGroupBy: (subtab): { groupBy: AnalyticsGroupByOptions } => {
      if (subtab === "groups") return { groupBy: "top_groups" };
      return { groupBy: "top_link_tags" };
    },
  },
  links: {
    subtabs: ["short_links", "destination_urls"],
    defaultSubtab: "short_links",
    getSubtabLabel: (subtab) => {
      if (subtab === "short_links") return "Short Links";
      return "Destination URLs";
    },
    getGroupBy: (subtab): { groupBy: AnalyticsGroupByOptions } => {
      if (subtab === "short_links") return { groupBy: "top_links" };
      return { groupBy: "top_base_urls" };
    },
  },
};

export function PartnerSection() {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit, adminPage, partnerPage } =
    useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<TabId>("segments");
  const [subtab, setSubtab] = useState<Subtab>(TAB_CONFIG[tab].defaultSubtab);

  // Reset subtab when tab changes to ensure it's valid for the new tab
  const handleTabChange = (newTab: TabId) => {
    setTab(newTab);
    setSubtab(TAB_CONFIG[newTab].defaultSubtab);
  };

  const groupByParams = useMemo(
    () => TAB_CONFIG[tab].getGroupBy(subtab),
    [tab, subtab],
  );

  const { data } = useAnalyticsFilterOption(groupByParams);

  const [persisted] = useWorkspacePreferences("linksDisplay");

  const getItemTitle = useCallback(
    (d: Record<string, any>) => {
      if (tab === "links") {
        if (subtab === "destination_urls") {
          return d.url || "Unknown";
        }
        // For short links
        const displayProperties = persisted?.displayProperties;
        if (displayProperties?.includes("title") && d.title) {
          return d.title;
        }
        return d.shortLink || "Unknown";
      }

      // For segments tab
      if (subtab === "groups") {
        return d.group?.name || "Unknown";
      }
      if (subtab === "tags") {
        return d.tag?.name || "Unknown";
      }

      return "Unknown";
    },
    [persisted, tab, subtab],
  );

  const subTabProps = useMemo(() => {
    if (adminPage || partnerPage) return {};
    const config = TAB_CONFIG[tab];
    return {
      subTabs: config.subtabs.map((s) => ({
        id: s,
        label: config.getSubtabLabel(s),
      })),
      selectedSubTabId: subtab,
      onSelectSubTab: setSubtab,
    };
  }, [tab, subtab, adminPage, partnerPage]);

  return (
    <AnalyticsCard
      tabs={[
        { id: "segments", label: "Partner Segments", icon: Users6 },
        { id: "links", label: "Partner Links", icon: Hyperlink },
      ]}
      expandLimit={8}
      hasMore={(data?.length ?? 0) > 8}
      selectedTabId={tab}
      onSelectTab={handleTabChange}
      {...subTabProps}
    >
      {({ limit, setShowModal }) =>
        data ? (
          data.length > 0 ? (
            <BarList
              tab={tab}
              data={
                data
                  ?.map((d) => {
                    const isSegmentsTab = tab === "segments";
                    const isLinksTab = tab === "links";
                    const isGroupsSubtab = isSegmentsTab && subtab === "groups";
                    const isTagsSubtab = isSegmentsTab && subtab === "tags";
                    const isShortLinksSubtab =
                      isLinksTab && subtab === "short_links";
                    const isDestinationUrlsSubtab =
                      isLinksTab && subtab === "destination_urls";

                    // Determine icon
                    let icon;
                    if (isGroupsSubtab) {
                      icon = d.group ? (
                        <GroupColorCircle group={d.group} />
                      ) : null;
                    } else if (isTagsSubtab) {
                      icon = d.tag ? (
                        <TagBadge
                          color={d.tag.color}
                          withIcon
                          className="sm:p-1"
                        />
                      ) : null;
                    } else {
                      icon = (
                        <LinkLogo
                          apexDomain={getApexDomain(d.url || "")}
                          className="size-5 sm:size-5"
                        />
                      );
                    }

                    // Determine href
                    let href: string | undefined;
                    if (isShortLinksSubtab) {
                      const hasLinkFilter =
                        searchParams.has("domain") && searchParams.has("key");
                      href = queryParams({
                        ...(hasLinkFilter
                          ? { del: ["domain", "key"] }
                          : {
                              set: {
                                domain: d.domain,
                                key: d.key || "_root",
                              },
                            }),
                        getNewPath: true,
                      }) as string;
                    } else if (isDestinationUrlsSubtab) {
                      const hasUrlFilter = searchParams.has("url");
                      href = queryParams({
                        ...(hasUrlFilter
                          ? { del: "url" }
                          : {
                              set: {
                                url: d.url,
                              },
                            }),
                        getNewPath: true,
                      }) as string;
                    } else if (isGroupsSubtab) {
                      const hasGroupFilter = searchParams.has("groupId");
                      href = queryParams({
                        ...(hasGroupFilter
                          ? { del: "groupId" }
                          : {
                              set: {
                                groupId: d.groupId,
                              },
                            }),
                        getNewPath: true,
                      }) as string;
                    } else if (isTagsSubtab) {
                      const hasTagFilter = searchParams.has("tagIds");
                      href = queryParams({
                        ...(hasTagFilter
                          ? { del: "tagIds" }
                          : {
                              set: {
                                tagIds: d.tagId,
                              },
                            }),
                        getNewPath: true,
                      }) as string;
                    }

                    return {
                      icon,
                      title: getItemTitle(d),
                      href,
                      value: d[dataKey] || 0,
                      ...(isShortLinksSubtab && { linkData: d }),
                    };
                  })
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
