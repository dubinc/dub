import { redis } from "@/lib/upstash";
import { getUrlFromStringIfValid, linkConstructorSimple } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { ExpandedLink } from "../api/links";
import { createId } from "../api/utils";
import { EdgeLinkProps } from "../planetscale";
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

// Create a new buff.ly link in Dub on-demand
export const importBitlyLink = async (shortKey: string) => {
  const workspaceId = "cm05wnnpo000711ztj05wwdbu";
  const userId = "cm05wnd49000411ztg2xbup0i";
  const folderId = "fold_LIZsdjTgFVbQVGYSUmYAi5vT";

  const apiKey = await redis.get<string>(`import:bitly:${workspaceId}`);

  if (!apiKey) {
    console.error(`[Bitly] No API key found for workspace ${workspaceId}`);
    return null;
  }

  let link: BitlyLink | null = null;

  for (const domain of ["buff.ly", "bit.ly"]) {
    link = await fetchBitlyLink({
      domain,
      shortKey,
      apiKey,
    });

    if (link) {
      break;
    }
  }

  if (!link) {
    return null;
  }

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
    domain: "buff.ly",
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
  };

  console.log("[Bitly] Creating link", newLink);

  await conn.execute(
    "INSERT INTO Link (id, projectId, userId, domain, `key`, url, shortLink, archived, folderId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      newLink.id,
      newLink.projectId,
      newLink.userId,
      newLink.domain,
      newLink.key,
      newLink.url,
      newLink.shortLink,
      newLink.archived,
      newLink.folderId,
      newLink.createdAt,
      newLink.updatedAt,
    ],
  );

  // TODO: fetch tags
  waitUntil(
    recordLink({
      ...newLink,
      tenantId: null,
      programId: null,
      partnerId: null,
      tags: [],
    } as unknown as ExpandedLink),
  );

  return newLink as unknown as EdgeLinkProps;
};

async function fetchBitlyLink({
  domain,
  shortKey,
  apiKey,
}: {
  domain: string;
  shortKey: string;
  apiKey: string;
}) {
  const response = await fetch(
    `https://api-ssl.bitly.com/v4/bitlinks/${domain}/${shortKey}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    },
  );

  if (!response.ok) {
    console.error(`[Bitly] Link ${domain}/${shortKey} not found.`);
    return null;
  }

  return await response.json();
}
