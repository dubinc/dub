"use client";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
*/

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import { endOfDay, min, startOfDay, subDays } from "date-fns";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { createContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { defaultConfig } from "swr/_internal";
import { UpgradeRequiredToast } from "../shared/upgrade-required-toast";
import Devices from "./devices";
import Locations from "./locations";
import Main from "./main";
import Referer from "./referer";
import Toggle from "./toggle";
import TopLinks from "./top-links";

export const AnalyticsContext = createContext<{
  basePath: string;
  baseApiPath: string;
  baseApiPathGeneric: string;
  selectedTab: string;
  domain?: string;
  key?: string;
  url?: string;
  queryString: string;
  start: Date;
  end: Date;
  tagId?: string;
  totalClicks?: number;
  admin?: boolean;
  demo?: boolean;
  requiresUpgrade?: boolean;
}>({
  basePath: "",
  baseApiPath: "",
  baseApiPathGeneric: "",
  selectedTab: "clicks",
  domain: "",
  queryString: "",
  start: new Date(),
  end: new Date(),
  admin: false,
  demo: false,
  requiresUpgrade: false,
});

export default function Analytics({
  staticDomain,
  staticUrl,
  admin,
  demo,
}: {
  staticDomain?: string;
  staticUrl?: string;
  admin?: boolean;
  demo?: boolean;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { id, slug } = useWorkspace();
  const [requiresUpgrade, setRequiresUpgrade] = useState(false);

  let { key } = useParams() as {
    key?: string;
  };
  const domainSlug = searchParams?.get("domain");
  // key can be a path param (public stats pages) or a query param (stats pages in app)
  key = searchParams?.get("key") || key;

  const tagId = searchParams?.get("tagId") ?? undefined;

  // Default to last 24 hours
  const { start, end } = useMemo(() => {
    return {
      // Set to start of day
      start: startOfDay(
        new Date(searchParams?.get("start") || subDays(new Date(), 1)),
      ),

      // Set to end of day or now if that's in the future
      end: min([
        endOfDay(new Date(searchParams?.get("end") || new Date())),
        new Date(),
      ]),
    };
  }, [searchParams?.get("start"), searchParams?.get("end")]);

  const selectedTab = searchParams.get("tab") || "clicks";

  const { basePath, domain, baseApiPath, baseApiPathGeneric } = useMemo(() => {
    if (admin) {
      return {
        basePath: `/analytics`,
        baseApiPath: `/api/analytics/admin`,
        baseApiPathGeneric: `/api/analytics/admin`,
        domain: domainSlug,
      };
    } else if (demo) {
      return {
        basePath: `/analytics/demo`,
        baseApiPath: `/api/analytics/demo/${selectedTab || "clicks"}`,
        baseApiPathGeneric: `/api/analytics/demo`,
        domain: domainSlug,
      };
    } else if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: `/api/analytics/${selectedTab || "clicks"}`,
        baseApiPathGeneric: `/api/analytics`,
        domain: domainSlug,
      };
    } else {
      // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
      return {
        basePath: `/stats/${key}`,
        baseApiPath: `/api/analytics/edge/${selectedTab || "clicks"}`,
        baseApiPathGeneric: `/api/analytics/edge`,
        domain: staticDomain,
      };
    }
  }, [admin, demo, slug, pathname, staticDomain, domainSlug, key, selectedTab]);

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
      ...(start &&
        end && { start: start.toISOString(), end: end.toISOString() }),
      ...(tagId && { tagId }),
      ...availableFilterParams,
    }).toString();
  }, [id, domain, key, searchParams, start, end, tagId]);

  // Reset requiresUpgrade when query changes
  useEffect(() => setRequiresUpgrade(false), [queryString]);

  const { data: totalClicks } = useSWR<number>(
    `${baseApiPath}/count?${queryString}`,
    fetcher,
    {
      onSuccess: () => setRequiresUpgrade(false),
      onError: (error) => {
        if (error.status === 403) {
          toast.custom(() => (
            <UpgradeRequiredToast
              title="Upgrade for more analytics"
              message={JSON.parse(error.message)?.error.message}
            />
          ));
          setRequiresUpgrade(true);
        } else {
          toast.error(error.message);
        }
      },
      onErrorRetry: (error, ...args) => {
        if (error.message.includes("Upgrade to Pro")) return;
        defaultConfig.onErrorRetry(error, ...args);
      },
    },
  );

  const isPublicStatsPage = basePath.startsWith("/stats");

  return (
    <AnalyticsContext.Provider
      value={{
        basePath, // basePath for the page (e.g. /stats/[key], /[slug]/analytics)
        baseApiPath, // baseApiPath for the API with the selected resource (e.g. /api/analytics/clicks)
        baseApiPathGeneric, // baseApiPathGeneric for the API without the selected resource (e.g. /api/analytics)
        selectedTab, // selected tab (clicks, leads, sales)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: staticUrl, // url for the link (only for public stats pages)
        start, // start of time period
        end, // end of time period
        tagId, // id of a single tag
        totalClicks, // total clicks for the link
        admin, // whether the user is an admin
        demo, // whether the user is viewing demo analytics
        requiresUpgrade, // whether an upgrade is required to perform the query
      }}
    >
      <div className="bg-gray-50 py-10">
        <Toggle />
        <div className="mx-auto grid max-w-screen-xl gap-5 px-2.5 lg:px-20">
          <Main />
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
