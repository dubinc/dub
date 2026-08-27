/*
    smart truncation algorithm that dynamically adjusts based on the length of the domain and the path
    it gives priority to the path and truncates the domain if it's too long
    at minimum the domain should still show 8 characters though
    strips http(s):// so stored shortLinks parse as domain/key
*/

import { truncate } from "./truncate";

// Truncate domain while preserving TLD. maxLength is the total output budget.
const truncateDomain = (domain: string, maxLength: number): string => {
  if (domain.length <= maxLength) {
    return domain;
  }

  const parts = domain.split(".");
  const tld = parts.pop() || "";
  const rest = parts.join(".");
  const restBudget = maxLength - 3 - tld.length;

  if (!rest || restBudget <= 0) {
    return truncate(domain, maxLength) ?? domain;
  }

  return `${rest.slice(0, restBudget)}...${tld}`;
};

export const smartTruncate = (link: string, maxLength: number): string => {
  const pretty = link.replace(/^https?:\/\//, "");

  if (pretty.length <= maxLength) return pretty;

  const [domain, ...pathParts] = pretty.split("/");
  const path = pathParts.join("/");

  // Root domain links have no path — never append "/"
  if (!path) return truncateDomain(domain, maxLength);

  const minDomainLength = 8;
  const maxPathLength = Math.max(maxLength - minDomainLength - 1, 0);
  const truncatedPath =
    maxPathLength > 0 ? truncate(path, maxPathLength) ?? "" : "";

  const domainBudget = Math.max(maxLength - truncatedPath.length - 1, 0);
  const truncatedDomain =
    domain.length <= domainBudget
      ? domain
      : truncateDomain(domain, domainBudget);

  return `${truncatedDomain}/${truncatedPath}`;
};
