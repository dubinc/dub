import { useRouter } from "next/router";
import { useMemo } from "react";
import useProject from "@/lib/swr/use-project";

export default function useEndpoint(staticDomain?: string) {
  const router = useRouter();
  const { slug, key } = router.query as {
    slug?: string;
    key: string;
  };

  const { project: { domain: projectDomain } = {} } = useProject();

  const { pageType, domain, endpoint } = useMemo(() => {
    // Project link page, e.g. app.dub.sh/dub/github
    if (slug && key) {
      return {
        pageType: slug,
        domain: projectDomain,
        endpoint: `/api/projects/${slug}/domains/${projectDomain}/links/${key}/stats`,
      };

      // Generic Dub.sh link page, e.g. app.dub.sh/links/steven
    } else if (key && router.asPath.startsWith("/links")) {
      return {
        pageType: "links",
        domain: "dub.sh",
        endpoint: `/api/links/${key}/stats`,
      };
    }

    // Public stats page, e.g. dub.sh/stats/github
    return {
      pageType: "stats",
      domain: staticDomain,
      endpoint: `/api/edge/links/${key}/stats`,
    };
  }, [slug, key, router.asPath]);

  return {
    pageType,
    domain,
    endpoint,
  };
}
