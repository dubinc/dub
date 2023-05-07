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
          ...(interval && { interval }),
          ...(domainSlug && { domain: domainSlug }),
        }).toString()}`
      : "";

  const { basePath, domain, endpoint } = useMemo(() => {
    // Project link page, e.g. app.dub.sh/dub/dub.sh/github
    if (slug && domainSlug && key) {
      return {
        basePath: `/${slug}/${domainSlug}/${key}`,
        domain: domainSlug,
        endpoint: `/api/projects/${slug}/links/${key}/stats`,
      };

      // Generic Dub.sh link page, e.g. app.dub.sh/links/steven
    } else if (key && router.asPath.startsWith("/links")) {
      return {
        basePath: `/links/${key}`,
        domain: "dub.sh",
        endpoint: `/api/links/${key}/stats`,
      };
    }

    // Public stats page, e.g. dub.sh/stats/github, stey.me/stats/weathergpt
    return {
      basePath: `/stats/${key}`,
      domain: staticDomain,
      endpoint: `/api/edge/links/${key}/stats`,
    };
  }, [slug, key, router.asPath]);

  return {
    basePath,
    domain,
    endpoint,
    queryString,
  };
}
