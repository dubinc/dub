import { redis } from "@/lib/upstash";
import { getUrlFromStringIfValid, linkConstructorSimple } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { ExpandedLink } from "../api/links";
import { createId } from "../api/utils";
import { conn } from "../planetscale/connection";
import { recordLink } from "../tinybird/record-link";

type BitlyLink = {
  id: string;
  long_url: string;
  archived: boolean;
  created_at: string;
  custom_bitlinks: string[];
  tags: string[];
};

// Create a new Bitly link in Dub on-demand
export const createBitlyLink = async (bitlyLink: string) => {
  const workspaceId = "";
  const userId = "";
  const folderId = "";

  const bitlyApiKey = await redis.get(`import:bitly:${workspaceId}`); // TODO: We might want to move this to a different key

  if (!bitlyApiKey) {
    console.error(`[Bitly] No API key found for workspace ${workspaceId}`);
    return null;
  }

  const response = await fetch(
    `https://api-ssl.bitly.com/v4/bitlinks/${bitlyLink}`,
    {
      headers: {
        Authorization: `Bearer ${bitlyApiKey}`,
      },
    },
  );

  const data = await response.json();

  if (!response.ok) {
    console.error(`[Bitly] Error retrieving Bitly link: ${bitlyLink}`, data);
    return null;
  }

  const link = data as BitlyLink;

  const [domain, key] = link.id.split("/");

  if (!domain || !key) {
    return null;
  }

  const sanitizedUrl = getUrlFromStringIfValid(link.long_url);

  if (!sanitizedUrl) {
    return null;
  }

  const newLink = {
    id: createId({ prefix: "link_" }),
    projectId: workspaceId,
    userId,
    domain,
    key,
    url: sanitizedUrl,
    shortLink: linkConstructorSimple({
      domain,
      key,
    }),
    archived: link.archived,
    folderId,
    tagIds: [], // TODO: add tags
    createdAt: new Date(link.created_at),
    updatedAt: new Date(link.created_at),
    tenantId: null,
    programId: null,
    partnerId: null,
  };

  console.log("[Bitly] Creating link", newLink);

  await conn.execute(
    "INSERT INTO Link (id, projectId, userId, domain, `key`, url, shortLink, archived, createdAt, updatedAt, folderId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newLink.id,
      newLink.projectId,
      newLink.userId,
      newLink.domain,
      newLink.key,
      newLink.url,
      newLink.shortLink,
      newLink.archived,
      newLink.createdAt,
      newLink.updatedAt,
      newLink.folderId,
    ],
  );

  // TODO: fetch tags
  waitUntil(
    recordLink({
      ...newLink,
      tags: [],
    } as unknown as ExpandedLink),
  );

  return newLink;
};
