/* 
    smart truncation algorithm that dynamically adjusts based on the length of the domain and the path
    it gives priority to the path and truncates the domain if it's too long
    at minimum the domain should still show 8 characters though
*/

import { truncate } from "./truncate";

// Function to truncate domain while preserving TLD and 2 characters before the dot
const truncateDomain = (domain: string, maxLength: number): string => {
  const parts = domain.split(".");
  const tld = parts.pop() || "";
  const rest = parts.join(".");
  const minRestLength = 3;

  if (rest.length + tld.length + 1 <= maxLength) {
    return `${rest}.${tld}`;
  }

  if (maxLength <= minRestLength + tld.length + 1) {
    return `${rest.slice(0, minRestLength)}.${tld}`;
  }

  const truncatedRest = truncate(rest, maxLength - tld.length - 1)!;
  return `${truncatedRest}${rest.slice(-2)}.${tld}`;
};

export const smartTruncate = (link: string, length: number): string => {
  if (link.length <= length) {
    return link;
  }

  const [domain, ...pathParts] = link.split("/");
  const path = pathParts.join("/");
  const minDomainLength = 12;

  // Calculate maximum domain length
  const maxDomainLength = Math.max(
    minDomainLength,
    Math.floor(length / 2), // Allow up to half of total length for domain
  );

  // Truncate domain if necessary, preserving TLD
  const truncatedDomain = truncateDomain(domain, maxDomainLength);

  // Calculate remaining length for path
  const remainingLength = Math.max(0, length - truncatedDomain.length - 1);

  // Truncate path
  const truncatedPath = truncate(path, remainingLength);

  return `${truncatedDomain}/${truncatedPath}`;
};
