import type { Domain } from "@/types";
import { getConfig } from "@/utils/config";
import { parseApiResponse } from "@/utils/parser";
import fetch from "node-fetch";

interface UpdateDomainProps {
  oldSlug: string;
  newSlug: string;
}

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

export async function createDomain(slug: string) {
  const config = await getConfig();

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: slug,
    }),
  };

  const response = await fetch("https://api.dub.co/domains", options);

  return await parseApiResponse<Domain[]>(response);
}

export async function updateDomain({ newSlug, oldSlug }: UpdateDomainProps) {
  const config = await getConfig();

  const options = {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      slug: newSlug,
    }),
  };

  const response = await fetch(
    `https://api.dub.co/domains/${oldSlug}`,
    options,
  );

  return await parseApiResponse<Domain[]>(response);
}

export async function deleteDomain(slug: string) {
  const config = await getConfig();

  const options = {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${config.key}`,
    },
  };

  const response = await fetch(`https://api.dub.co/domains/${slug}`, options);

  return await parseApiResponse<Domain["id"]>(response);
}
