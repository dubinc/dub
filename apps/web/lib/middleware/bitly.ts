import { redis } from "@/lib/upstash";
import { getUrlFromStringIfValid, linkConstructorSimple } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { ExpandedLink } from "../api/links";
import { createId } from "../api/utils";
import { EdgeLinkProps } from "../planetscale";
import { conn } from "../planetscale/connection";
import { recordLink } from "../tinybird/record-link";

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

  const link = await fetchBitlyLink({
    domain: "buff.ly",
    shortKey,
    apiKey,
  });

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
    archived: link.archived ?? false,
    folderId,
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
    console.log(
      `[Bitly] Hit rate limit, crawling bit.ly/${shortKey} instead...`,
    );
    return await crawlBitlyLink(shortKey);
  }

  return await response.json();
}

async function crawlBitlyLink(shortKey: string) {
  const response = await fetch(`https://bit.ly/${shortKey}`, {
    redirect: "manual",
  });

  if (!response.ok && response.status !== 301 && response.status !== 302) {
    console.error(`[Bitly] Link bit.ly/${shortKey} not found.`);
    return null;
  }

  const destinationUrl = response.headers.get("location");
  if (!destinationUrl) {
    console.error(`[Bitly] No redirect URL found for bit.ly/${shortKey}`);
    return null;
  }

  console.log(`[Bitly] Found link buff.ly/${shortKey} -> ${destinationUrl}`);

  return {
    id: `buff.ly/${shortKey}`,
    long_url: destinationUrl,
    created_at: new Date().toISOString(),
  };
}
