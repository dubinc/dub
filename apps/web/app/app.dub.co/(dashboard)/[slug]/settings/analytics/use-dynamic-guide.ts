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

    if (conversionTrackingEnabled && publishableKey && result) {
      // Store original result for context checks
      const originalResult = result;

      result = result
        // for manual installations - add data-publishable-key after src attribute
        .replaceAll(
          /(<script[\s\S]*?)(src="https:\/\/www\.dubcdn\.com\/analytics\/script[^"]+")([\s\S]*?)(>)/g,
          (match, beforeSrc, srcAttr, afterSrc, closingTag) => {
            if (match.includes("data-publishable-key")) return match;

            // Find src line in original to get indentation
            const originalLines = originalResult.split("\n");
            const srcLine =
              originalLines.find((line) => line.includes(srcAttr)) || "";
            const indent = srcLine.match(/^(\s*)/)?.[1] || "  ";

            // Clean up other attributes
            const otherAttrs = afterSrc.replace(/>$/, "").trim();

            const domainsConfigParts = [
              ...(program ? [`"refer": "${program.domain}"`] : []),
              ...(domainTrackingEnabled
                ? [`"outbound": ["example.com", "example.sh"]`]
                : []),
            ].join(`, `);
            const parts = [
              `data-publishable-key="${publishableKey}"`,
              ...(domainsConfigParts
                ? [`data-domains='{${domainsConfigParts}}'`]
                : []),
            ].join(`\n${indent}`);

            // Return: before src, src, publishable-key, other attrs, closing tag
            return `${beforeSrc}${srcAttr}\n${indent}${parts}${otherAttrs ? `\n${indent}${otherAttrs}` : ""}\n${closingTag}`;
          },
        )
        // for React applications - add publishableKey prop after <DubAnalytics
        .replaceAll(
          /^(\s+)(<DubAnalytics)(\s*\/?>|\s+[^\n>]*\/?>|)$/gm,
          (match, indent, tag, rest) => {
            if (match.includes("publishableKey")) return match;
            // Check context for multiline case
            if (rest === "") {
              const idx = originalResult.indexOf(match);
              if (idx >= 0) {
                const context = originalResult.substring(idx, idx + 300);
                if (context.includes("publishableKey")) return match;
              }
            }

            const domainsConfigParts = [
              ...(program ? [`refer: "${program.domain}"`] : []),
              ...(domainTrackingEnabled
                ? [`outbound: ["example.com", "example.sh"]`]
                : []),
            ].join(`,\n${indent}    `);
            const parts = [
              `publishableKey="${publishableKey}"`,
              ...(domainsConfigParts
                ? [
                    `domainsConfig={{\n${indent}    ${domainsConfigParts}\n${indent}  }}`,
                  ]
                : []),
            ].join(`\n  ${indent}`);

            return `${indent}${tag}\n${indent}  ${parts}${rest}`;
          },
        )
        // for GTM installations - add data-publishable-key after script.src
        .replaceAll(
          /^(\s+)(script\.src\s*=\s*"https:\/\/www\.dubcdn\.com\/analytics\/script[^"]+";)$/gm,
          (match, indent, srcLine) => {
            const idx = originalResult.indexOf(match);
            if (idx >= 0) {
              const context = originalResult.substring(idx, idx + 200);
              if (context.includes("data-publishable-key")) return match;
            }

            const domainsConfigParts = [
              ...(program ? [`"refer": "${program.domain}"`] : []),
              ...(domainTrackingEnabled
                ? [`"outbound": ["example.com", "example.sh"]`]
                : []),
            ].join(`, `);
            const parts = [
              `script.setAttribute("data-publishable-key", "${publishableKey}");`,
              ...(domainsConfigParts
                ? [
                    `script.dataset.domains = JSON.stringify({${domainsConfigParts}});`,
                  ]
                : []),
            ].join(`\n${indent}`);

            return `${indent}${srcLine}\n${indent}${parts}`;
          },
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
