"use client";
/* 
  This Analytics component lives in 2 different places:
  1. Workspace analytics page, e.g. app.dub.co/dub/analytics
  2. Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
*/

import { VALID_ANALYTICS_FILTERS } from "@/lib/analytics/constants";
import useWorkspace from "@/lib/swr/use-workspace";
import { fetcher } from "@dub/utils";
import { endOfDay, min, subDays } from "date-fns";
import { useParams, usePathname, useSearchParams } from "next/navigation";
import { createContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";
import { defaultConfig } from "swr/_internal";
import { UpgradeToProToast } from "../shared/upgrade-to-pro-toast";
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
  start: Date;
  end: Date;
  tagId?: string;
  totalClicks?: number;
  admin?: boolean;
  requiresUpgrade?: boolean;
}>({
  basePath: "",
  baseApiPath: "",
  domain: "",
  queryString: "",
  start: new Date(),
  end: new Date(),
  admin: false,
  requiresUpgrade: false,
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
      start: new Date(searchParams?.get("start") || subDays(new Date(), 1)),

      // Set to end of day or now if that's in the future
      end: min([
        endOfDay(new Date(searchParams?.get("end") || new Date())),
        new Date(),
      ]),
    };
  }, [searchParams]);

  const { basePath, domain, baseApiPath } = useMemo(() => {
    // Workspace analytics page, e.g. app.dub.co/dub/analytics?domain=dub.sh&key=github
    if (admin) {
      return {
        basePath: `/analytics`,
        baseApiPath: `/api/analytics/admin/clicks`,
        domain: domainSlug,
      };
    } else if (slug) {
      return {
        basePath: `/${slug}/analytics`,
        baseApiPath: `/api/analytics/clicks`,
        domain: domainSlug,
      };
    } else {
      // Public stats page, e.g. dub.co/stats/github, stey.me/stats/weathergpt
      return {
        basePath: `/stats/${key}`,
        baseApiPath: "/api/analytics/edge/clicks",
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
            <UpgradeToProToast
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
        baseApiPath, // baseApiPath for the API (e.g. /api/analytics)
        queryString,
        domain: domain || undefined, // domain for the link (e.g. dub.sh, stey.me, etc.)
        key: key ? decodeURIComponent(key) : undefined, // link key (e.g. github, weathergpt, etc.)
        url: staticUrl, // url for the link (only for public stats pages)
        start, // start of time period
        end, // end of time period
        tagId, // id of a single tag
        totalClicks, // total clicks for the link
        admin, // whether the user is an admin
        requiresUpgrade, // whether an upgrade is required to perform the query
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
