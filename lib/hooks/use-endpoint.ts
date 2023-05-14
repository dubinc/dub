import { useRouter } from "next/router";
import { useMemo } from "react";

export default function useEndpoint(staticDomain?: string) {
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

  return {
    basePath,
    domain,
    endpoint,
    queryString,
  };
}
