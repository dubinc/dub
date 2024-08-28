import useDomains from "@/lib/swr/use-domains";
import { useMemo } from "react";

/**
 * @param {string} [options.currentDomain] The current domain of a link being updated (useful when the link's current domain has been archived)
 * @returns {Array} An array of available domains for creating or updating a link.
 */
export function useAvailableDomains(options: { currentDomain?: string } = {}) {
  const { currentDomain } = options;

  const { allActiveDomains, primaryDomain, allDomains, loading } = useDomains();

  const domains = useMemo(() => {
    if (
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
  }, [allDomains, allActiveDomains, currentDomain]);

  return { domains, loading, primaryDomain };
}
