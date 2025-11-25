import { AnalyticsGroupByOptions } from "@/lib/analytics/types";
import { useWorkspacePreferences } from "@/lib/swr/use-workspace-preferences";
import { LinkLogo, useRouterStuff } from "@dub/ui";
import { Globe, Hyperlink } from "@dub/ui/icons";
import { getApexDomain } from "@dub/utils";
import { useCallback, useContext, useMemo, useState } from "react";
import { FolderIcon } from "../folders/folder-icon";
import TagBadge from "../links/tag-badge";
import { AnalyticsCard } from "./analytics-card";
import { AnalyticsLoadingSpinner } from "./analytics-loading-spinner";
import { AnalyticsContext } from "./analytics-provider";
import { BarList } from "./bar-list";
import { useAnalyticsFilterOption } from "./utils";

type TabId = "links" | "urls";
type LinksSubtab = "links" | "folders" | "tags";
type UrlsSubtab = "base_urls" | "full_urls";
type Subtab = LinksSubtab | UrlsSubtab;

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
  links: {
    subtabs: ["links", "folders", "tags"],
    defaultSubtab: "links",
    getSubtabLabel: (subtab) => {
      if (subtab === "links") return "Links";
      if (subtab === "folders") return "Folders";
      return "Tags";
    },
    getGroupBy: (subtab) => {
      if (subtab === "links") return { groupBy: "top_links" };
      if (subtab === "folders") return { groupBy: "top_folders" };
      return { groupBy: "top_link_tags" };
    },
  },
  urls: {
    subtabs: ["base_urls", "full_urls"],
    defaultSubtab: "base_urls",
    getSubtabLabel: (subtab) =>
      subtab === "full_urls" ? "Full URLs" : "Base URLs",
    getGroupBy: (subtab) => ({
      groupBy: subtab === "full_urls" ? "top_urls" : "top_base_urls",
    }),
  },
};

export function TopLinks({ filterLinks = true }: { filterLinks?: boolean }) {
  const { queryParams, searchParams } = useRouterStuff();

  const { selectedTab, saleUnit, adminPage, partnerPage } =
    useContext(AnalyticsContext);
  const dataKey = selectedTab === "sales" ? saleUnit : "count";

  const [tab, setTab] = useState<TabId>("links");
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
      if (tab === "urls") {
        return d.url || "Unknown";
      }

      // For links tab with different subtabs
      if (subtab === "folders") {
        return d.folder?.name || "Unknown";
      }
      if (subtab === "tags") {
        return d.tag?.name || "Unknown";
      }

      // For links subtab
      const displayProperties = persisted?.displayProperties;

      if (displayProperties?.includes("title") && d.title) {
        return d.title;
      }

      return d.shortLink || "Unknown";
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
        { id: "links", label: "Short Links", icon: Hyperlink },
        { id: "urls", label: "Destination URLs", icon: Globe },
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
                    const isLinksTab = tab === "links";
                    const isUrlsTab = tab === "urls";
                    const isFoldersSubtab = isLinksTab && subtab === "folders";
                    const isTagsSubtab = isLinksTab && subtab === "tags";
                    const isLinksSubtab = isLinksTab && subtab === "links";

                    // Determine icon
                    let icon;
                    if (isFoldersSubtab) {
                      icon = d.folder ? (
                        <FolderIcon
                          folder={d.folder}
                          shape="square"
                          iconClassName="size-3"
                        />
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
                    if (filterLinks) {
                      if (isLinksSubtab) {
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
                      } else if (isUrlsTab) {
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
                      } else if (isFoldersSubtab) {
                        const hasFolderFilter = searchParams.has("folderId");
                        href = queryParams({
                          ...(hasFolderFilter
                            ? { del: "folderId" }
                            : {
                                set: {
                                  folderId: d.folderId,
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
                    }

                    return {
                      icon,
                      title: getItemTitle(d),
                      href,
                      value: d[dataKey] || 0,
                      ...(isLinksSubtab && { linkData: d }),
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
