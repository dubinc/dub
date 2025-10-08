import useDomains from "@/lib/swr/use-domains";
import useGuide from "@/lib/swr/use-guide";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { useMemo } from "react";
import { SWRConfiguration } from "swr";

export function useDynamicGuide(
  { guide }: { guide: string },
  swrOpts?: SWRConfiguration,
) {
  const { guideMarkdown: guideMarkdownRaw, error } = useGuide(guide, swrOpts);

  const { primaryDomain } = useDomains();

  const [siteVisitTrackingEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsSiteVisitTrackingEnabled",
  );
  const [domainTrackingEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsOutboundDomainTrackingEnabled",
  );
  const [conversionTrackingEnabled] = useWorkspaceStore<boolean>(
    "analyticsSettingsConversionTrackingEnabled",
  );

  const guideMarkdown = useMemo(() => {
    let result = guideMarkdownRaw;

    if (primaryDomain)
      result = result?.replaceAll(/yourcompany\.link/g, primaryDomain);

    const scriptComponents = [
      siteVisitTrackingEnabled ? "site-visit" : null,
      domainTrackingEnabled ? "outbound-domains" : null,
      conversionTrackingEnabled ? "conversion-tracking" : null,
    ]
      .filter(Boolean)
      .join(".");

    if (scriptComponents.length)
      result = result?.replaceAll(
        /https\:\/\/www.dubcdn.com\/analytics\/script.js/g,
        `https://www.dubcdn.com/analytics/script.${scriptComponents}.js`,
      );

    // Outbound domains
    if (domainTrackingEnabled) {
      result = result
        ?.replaceAll(
          /(data-domains='{[^}]+)(}')/g,
          `$1, "outbound": ["example.com", "example.sh"]$2`,
        )
        ?.replaceAll(
          /(domainsConfig={{\n)(\s+)([^\n]+)\n(\s+}})/gm,
          `$1$2$3,\n$2outbound: ["example.com", "example.sh"]\n$4`,
        );
    }

    return result;
  }, [
    guideMarkdownRaw,
    primaryDomain,
    siteVisitTrackingEnabled,
    domainTrackingEnabled,
    conversionTrackingEnabled,
  ]);

  return {
    guideMarkdown,
    error,
    loading: !guideMarkdown && !error,
  };
}
