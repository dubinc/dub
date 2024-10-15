import { getConfig } from "@/utils/config";
import { parseApiResponse } from "@/utils/parser";
import { Dub } from "dub";
import fetch from "node-fetch";

export async function getDomains() {
  const config = await getConfig();

  const dub = new Dub({
    token: config.access_token,
  });

  const [{ result: domainsResponse }, defaultDomainsResponse] =
    await Promise.all([
      dub.domains.list(),
      fetch("https://api.dub.co/domains/default", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${config.access_token}`,
          "Content-Type": "application/json",
        },
      }),
    ]);

  const [domains, defaultDomains] = await Promise.all([
    domainsResponse,
    parseApiResponse<string[]>(defaultDomainsResponse),
  ]);

  const allSlugs = [...domains.map((domain) => domain.slug), ...defaultDomains];

  return Array.from(new Set(allSlugs));
}
