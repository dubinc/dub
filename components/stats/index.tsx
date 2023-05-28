import { useRouter } from "next/router";
import { createContext, useMemo } from "react";
import Clicks from "./clicks";
import Devices from "./devices";
import Feedback from "./feedback";
import Locations from "./locations";
import Referer from "./referer";
import Toggle from "./toggle";

export const StatsContext = createContext<{
  basePath: string;
  endpoint: string;
  queryString: string;
  interval: string;
  domain: string;
  key: string;
  modal?: boolean;
}>({
  basePath: "",
  endpoint: "",
  queryString: "",
  interval: "",
  domain: "",
  key: "",
  modal: false,
});

export default function Stats({
  atModalTop,
  staticDomain,
}: {
  atModalTop?: boolean;
  staticDomain?: string;
}) {
  const router = useRouter();
  const {
    slug,
    domain: domainSlug,
    key,
    interval = "24h",
  } = router.query as {
    slug?: string;
    domain?: string;
    key: string;
    interval?: string;
  };

  const queryString =
    interval || domainSlug
      ? `?${new URLSearchParams({
          ...(slug && { slug }),
          ...(interval && { interval }),
          ...(domainSlug && { domain: domainSlug }),
        }).toString()}`
      : "";

  const { basePath, domain, endpoint } = useMemo(() => {
    // Project link page, e.g. app.dub.sh/dub/dub.sh/github
    if (slug && domainSlug && key) {
      return {
        basePath: `/${slug}/${domainSlug}/${encodeURIComponent(key)}`,
        domain: domainSlug,
        endpoint: `/api/links/${encodeURIComponent(key)}/stats`,
      };

      // Generic Dub.sh link page, e.g. app.dub.sh/links/steven
    } else if (key && router.asPath.startsWith("/links")) {
      return {
        basePath: `/links/${encodeURIComponent(key)}`,
        domain: "dub.sh",
        endpoint: `/api/links/${encodeURIComponent(key)}/stats`,
      };
    }

    // Public stats page, e.g. dub.sh/stats/github, stey.me/stats/weathergpt
    return {
      basePath: `/stats/${encodeURIComponent(key)}`,
      domain: staticDomain,
      endpoint: `/api/edge/links/${encodeURIComponent(key)}/stats`,
    };
  }, [slug, key, router.asPath]);

  return (
    <StatsContext.Provider
      value={{
        basePath, // basePath for the page (e.g. /stats/[key], /links/[key], /[slug]/[domain]/[key])
        domain: domain!, // domain for the link (e.g. dub.sh, stey.me, etc.)
        endpoint, // endpoint for the API (e.g. /api/edge/links/[key]/stats)
        queryString, // query string for the API (e.g. ?interval=24h&domain=dub.sh, ?interval=24h, etc.)
        interval, // time interval (e.g. 24h, 7d, 30d, etc.)
        key, // link key (e.g. github, weathergpt, etc.)
      }}
    >
      <div className="bg-gray-50 py-10">
        <Toggle atModalTop={atModalTop} />
        <div className="mx-auto grid max-w-4xl gap-5">
          <Clicks />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Locations />
            <Devices />
            <Referer />
            <Feedback />
          </div>
        </div>
      </div>
    </StatsContext.Provider>
  );
}
