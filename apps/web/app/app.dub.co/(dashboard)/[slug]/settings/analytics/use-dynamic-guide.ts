import useGuide from "@/lib/swr/use-guide";
import useProgram from "@/lib/swr/use-program";
import useWorkspace from "@/lib/swr/use-workspace";
import { useWorkspaceStore } from "@/lib/swr/use-workspace-store";
import { useMemo } from "react";
import { SWRConfiguration } from "swr";

export function useDynamicGuide(
  { guide }: { guide: string },
  swrOpts?: SWRConfiguration,
) {
  const { guideMarkdown: guideMarkdownRaw, error } = useGuide(guide, swrOpts);

  const { publishableKey } = useWorkspace();
  const { program } = useProgram();

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

    if (program?.domain)
      result = result?.replaceAll(/yourcompany\.link/g, program.domain);

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

    if (conversionTrackingEnabled && publishableKey) {
      result = result
        ?.replaceAll(
          /^(\s+)(data-domains=.+)$/gm,
          `$1$2\n$1data-publishable-key="${publishableKey}"`,
        )
        ?.replaceAll(
          /^(\s+)(.+)(domainsConfig={{)/gm,
          `$1$2publishableKey="${publishableKey}" $3`,
        );
    }

    return result;
  }, [
    guideMarkdownRaw,
    program?.domain,
    siteVisitTrackingEnabled,
    domainTrackingEnabled,
    conversionTrackingEnabled,
    publishableKey,
  ]);

  return {
    guideMarkdown,
    error,
    loading: !guideMarkdown && !error,
  };
}
