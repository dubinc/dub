"use client";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
*/

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics";
import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { createContext, useMemo } from "react";
import useSWR from "swr";
import Clicks from "./clicks";
import Devices from "./devices";
import Locations from "./locations";
import Referer from "./referer";
import Toggle from "./toggle";
import TopLinks from "./top-links";

export const AnalyticsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  domain?: string;
  key?: string;
  url?: string;
  queryString: string;
  interval: string;
  tagId?: string;
  totalClicks?: number;
  admin?: boolean;
}>({
  basePath: "",
  baseApiPath: "",
  domain: "",
  queryString: "",
  interval: "",
  admin: false,
});

export default function Analytics({
  staticDomain,
  staticUrl,
  admin,
}: {
  staticDomain?: string;
  staticUrl?: string;
  admin?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { id, slug } = useWorkspace();

  let { key } = useParams() as {
    key?: string;
  };
  const domainSlug = searchParams?.get("domain");
  // key can be a path param (public stats pages) or a query param (stats pages in app)
  key = searchParams?.get("key") || key;
  const interval = searchParams?.get("interval") || "24h";

  const tagId = searchParams?.get("tagId") ?? undefined;

  const { basePath, domain, baseApiPath } = useMemo(() => {
    // Workspace analytics page, e.g. app.dub.co/dub/analytics?domain=dub.sh&key=github
    if (admin) {
      return {
        basePath: `/analytics`,
        baseApiPath: `/api/admin/analytics`,
        domain: domainSlug,
      };
    } else if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: `/api/analytics`,
        domain: domainSlug,
      };
    } else {
      // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
      return {
        basePath: `/stats/${key}`,
        baseApiPath: "/api/analytics/edge",
        domain: staticDomain,
      };
    }
  }, [admin, slug, pathname, staticDomain, domainSlug, key]);

  const queryString = useMemo(() => {
    const availableFilterParams = VALID_ANALYTICS_FILTERS.reduce(
      (acc, filter) => ({
        ...acc,
        ...(searchParams?.get(filter) && {
          [filter]: searchParams.get(filter),
        }),
      }),
      {},
    );
    return new URLSearchParams({
      ...(id && { workspaceId: id }),
      ...(domain && { domain }),
      ...(key && { key }),
      ...(interval && { interval }),
      ...(tagId && { tagId }),
      ...availableFilterParams,
    }).toString();
  }, [id, domain, key, searchParams, interval, tagId]);

  const { data: totalClicks } = useSWR<number>(
    `${baseApiPath}/clicks?${queryString}`,
    fetcher,
  );

  const isPublicStatsPage = basePath.startsWith("/stats");

  return (
    <AnalyticsContext.Provider
      value={{
        basePath, // basePath for the page (e.g. /stats/[key], /[slug]/analytics)
        baseApiPath, // baseApiPath for the API (e.g. /api/analytics)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: staticUrl, // url for the link (only for public stats pages)
        interval, // time interval (e.g. 24h, 7d, 30d, etc.)
        tagId, // id of a single tag
        totalClicks, // total clicks for the link
        admin, // whether the user is an admin
      }}
    >
      <div className="bg-gray-50 py-10">
        <Toggle />
        <div className="mx-auto grid max-w-4xl gap-5">
          <Clicks />
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Locations />
            {!isPublicStatsPage && <TopLinks />}
            <Devices />
            <Referer />
            {isPublicStatsPage && <TopLinks />}
            {/* <Feedback /> */}
          </div>
        </div>
      </div>
    </AnalyticsContext.Provider>
  );
}
