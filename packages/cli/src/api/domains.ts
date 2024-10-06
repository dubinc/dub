import type { Domain } from "@/types";
import { getConfig } from "@/utils/config";
import { parseApiResponse } from "@/utils/parser";
import fetch from "node-fetch";

export async function getDomains() {
  const config = await getConfig();

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
  };

  const [domainsResponse, defaultDomainsResponse] = await Promise.all([
    fetch("https://api.dub.co/domains", options),
    fetch("https://api.dub.co/domains/default", options),
  ]);

  const [domains, defaultDomains] = await Promise.all([
    parseApiResponse<Domain[]>(domainsResponse),
    parseApiResponse<string[]>(defaultDomainsResponse),
  ]);

  const allSlugs = [...domains.map((domain) => domain.slug), ...defaultDomains];

  return Array.from(new Set(allSlugs));
}
