import useDomains from "@/lib/swr/use-domains";
import { DUB_DOMAINS, SHORT_DOMAIN } from "@dub/utils";
import { useMemo } from "react";

// Sort domains alphabetically, with a specific domain prioritized
const sortDomains = (domains: any[], prioritySlug?: string) => {
  return domains.sort((a, b) => {
    if (prioritySlug) {
      if (a.slug === prioritySlug && b.slug !== prioritySlug) return -1;
      if (a.slug !== prioritySlug && b.slug === prioritySlug) return 1;
    }
    // Sort by primary status first, then alphabetically
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.slug.localeCompare(b.slug);
  });
};

/**
 * @param {string} [options.currentDomain] The current domain of a link being updated (useful when the link's current domain has been archived)
 * @param {boolean} [options.onboarding] Whether the user is on the onboarding page (we can assume the user doesn't have any custom domains yet, so just show the Dub default domains)
 * @returns {Array} An array of available domains for creating or updating a link.
 */
export function useAvailableDomains(
  options: {
    currentDomain?: string;
    onboarding?: boolean;
    search?: string;
  } = {},
) {
  const { currentDomain } = options;

  const {
    activeWorkspaceDomains,
    activeDefaultDomains,
    allDomains,
    allWorkspaceDomains,
    loading,
    primaryDomain,
  } = useDomains({
    ignoreParams: true,
    opts: options.search ? { search: options.search } : undefined,
  });

  const domains = useMemo(() => {
    // Case 1: Onboarding - only show non-archived Dub domains
    if (options.onboarding) {
      return DUB_DOMAINS.filter((d) => !d.archived);
    }

    // Case 2: Current domain exists but is not in active domains
    if (
      currentDomain &&
      !activeWorkspaceDomains?.find(({ slug }) => slug === currentDomain) &&
      !activeDefaultDomains.find(({ slug }) => slug === currentDomain)
    ) {
      // If the current domain is not in active domains, try to find it in all domains
      const domain = allDomains.find(({ slug }) => slug === currentDomain);
      if (!domain) {
        // If domain not found at all, return all active domains
        return [
          ...sortDomains(activeWorkspaceDomains || []),
          ...sortDomains(activeDefaultDomains, "dub.link"),
        ];
      }

      // If domain is found, add it to the appropriate section
      const isDefaultDomain = activeDefaultDomains.some(
        ({ id }) => id === domain.id,
      );
      return [
        ...sortDomains(activeWorkspaceDomains || []),
        ...(isDefaultDomain ? [] : [domain]),
        ...sortDomains(activeDefaultDomains, "dub.link"),
        ...(isDefaultDomain ? [domain] : []),
      ];
    }

    // Default case: return active workspace domains first, then active default domains
    return [
      // Workspace domains first, sorted by primary status then alphabetically
      ...sortDomains(activeWorkspaceDomains || []).map((domain) => ({
        ...domain,
        isWorkspaceDomain: true,
      })),
      // Default domains next, with dub.link first, then alphabetically
      ...sortDomains(activeDefaultDomains, "dub.link").map((domain) => ({
        ...domain,
        isWorkspaceDomain: false,
      })),
    ];
  }, [
    options.onboarding,
    currentDomain,
    allDomains,
    activeWorkspaceDomains,
    activeDefaultDomains,
  ]);

  return {
    domains,
    allWorkspaceDomains,
    activeWorkspaceDomains,
    loading: options.onboarding ? false : loading,
    primaryDomain: options.onboarding ? SHORT_DOMAIN : primaryDomain,
  };
}
