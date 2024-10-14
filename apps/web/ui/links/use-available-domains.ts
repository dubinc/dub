import useDomains from "@/lib/swr/use-domains";
import { DUB_DOMAINS, SHORT_DOMAIN } from "@dub/utils";
import { useMemo } from "react";

/**
 * @param {string} [options.currentDomain] The current domain of a link being updated (useful when the link's current domain has been archived)
 * @param {boolean} [options.onboarding] Whether the user is on the onboarding page (we can assume the user doesn't have any custom domains yet, so just show the Dub default domains)
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
    allActiveDomains,
    primaryDomain,
    allDomains,
    allWorkspaceDomains,
    loading,
  } = useDomains(options.search ? { params: { search: options.search } } : {});

  const domains = useMemo(() => {
    if (options.onboarding) {
      return DUB_DOMAINS.filter((d) => !d.archived);
    } else if (
      currentDomain &&
      !allActiveDomains.find(({ slug }) => slug === currentDomain)
    ) {
      const domain = allDomains.find(({ slug }) => slug === currentDomain);

      return domain
        ? [...allActiveDomains, domain]
            .filter(Boolean)
            .sort((a, b) => a.slug.localeCompare(b.slug))
        : allActiveDomains.sort((a, b) => a.slug.localeCompare(b.slug));
    }
    return allActiveDomains.sort((a, b) => a.slug.localeCompare(b.slug));
  }, [options, allDomains, allActiveDomains, currentDomain]);

  return {
    domains,
    allWorkspaceDomains,
    loading: options.onboarding ? false : loading,
    primaryDomain: options.onboarding ? SHORT_DOMAIN : primaryDomain,
  };
}
