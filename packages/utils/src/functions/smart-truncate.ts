/* 
    smart truncation algorithm that dynamically adjusts based on the length of the domain and the path
    it gives priority to the path and truncates the domain if it's too long
    at minimum the domain should still show 8 characters though
*/

import { truncate } from "./truncate";

// Function to truncate domain while preserving TLD
const truncateDomain = (domain: string, maxLength: number): string => {
  const parts = domain.split(".");
  const tld = parts.pop() || "";
  const rest = parts.join(".");

  return `${rest.slice(0, maxLength)}...${tld}`;
};

export const smartTruncate = (link: string, maxLength: number): string => {
  if (link.length <= maxLength) {
    return link;
  }

  const [domain, ...pathParts] = link.split("/");
  const path = pathParts.join("/");
  const minDomainLength = 8;

  // calculate max path length
  const maxPathLength = maxLength - minDomainLength;

  // Truncate path
  const truncatedPath = truncate(path, maxPathLength)!;

  // Truncate domain if necessary, preserving TLD
  const truncatedDomain = truncateDomain(
    domain,
    maxLength - truncatedPath.length,
  );

  return `${truncatedDomain}/${truncatedPath}`;
};
