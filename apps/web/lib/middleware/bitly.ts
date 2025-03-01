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

  const link = await crawlBitlyLink({
    domain: "buff.ly",
    shortKey,
    workspaceId,
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

  try {
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
  } catch (error) {
    console.error("[Bitly] Error creating link", error);
    return null;
  }
};

async function crawlBitlyLink({
  domain,
  shortKey,
  workspaceId,
}: {
  domain: string;
  shortKey: string;
  workspaceId: string;
}) {
  const response = await fetch(`https://bit.ly/${shortKey}`, {
    redirect: "manual",
    headers: {
      Host: "buff.ly",
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok && response.status !== 301 && response.status !== 302) {
    console.error(`[Bitly] Link ${domain}/${shortKey} not found.`);
    return await fetchBitlyLink({ domain, shortKey, workspaceId });
  }

  const destinationUrl = response.headers.get("location");
  if (!destinationUrl) {
    console.error(`[Bitly] No redirect URL found for ${domain}/${shortKey}`);
    return null;
  }

  console.log(`[Bitly] Found link ${domain}/${shortKey} -> ${destinationUrl}`);

  return {
    id: `buff.ly/${shortKey}`,
    long_url: destinationUrl,
    created_at: new Date().toISOString(),
  };
}

async function fetchBitlyLink({
  domain,
  shortKey,
  workspaceId,
}: {
  domain: string;
  shortKey: string;
  workspaceId: string;
}) {
  const apiKey = await redis.get<string>(`import:bitly:${workspaceId}`);

  if (!apiKey) {
    console.error(`[Bitly] No API key found for workspace ${workspaceId}`);
    return null;
  }

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
      `[Bitly] Hit rate limit, returning 404 for ${domain}/${shortKey}`,
    );
    return null;
  }

  return await response.json();
}
