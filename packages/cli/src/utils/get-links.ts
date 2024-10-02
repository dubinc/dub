import type { CreateLinkProps, GetLink } from "@/types";
import { getConfig } from "@/utils/get-config";
import { parseApiResponse } from "@/utils/parser";
import fetch from "node-fetch";

export async function createLink({ url, key }: CreateLinkProps) {
  const config = await getConfig();

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      domain: config.domain,
      url: url,
      key: key,
    }),
  };

  const response = await fetch("https://api.dub.co/links", options);
  return await parseApiResponse<GetLink>(response);
}

export async function getLinks() {
  const config = await getConfig();

  const options = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
    },
  };

  const response = await fetch("https://api.dub.co/links", options);
  const parsedData = await parseApiResponse<GetLink[]>(response);

  const links = parsedData.map((link) => ({
    url: `https://${link.domain}/${link.key}`,
    clicks: link.clicks,
  }));

  return links;
}
