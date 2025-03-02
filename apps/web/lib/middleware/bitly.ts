import {
  APP_DOMAIN,
  getUrlFromStringIfValid,
  linkConstructorSimple,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { ExpandedLink } from "../api/links";
import { createId } from "../api/utils";
import { EdgeLinkProps } from "../planetscale";
import { conn } from "../planetscale/connection";
import { recordLink } from "../tinybird/record-link";

const crawlBitlyResultSchema = z.object({
  id: z.string(),
  long_url: z.string(),
  created_at: z.string(),
});

// Create a new Bitly-hosted link to Dub on-demand (e.g. buff.ly)
export const importBitlyLink = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) => {
  const workspaceId = "cm05wnnpo000711ztj05wwdbu";
  const userId = "cm05wnd49000411ztg2xbup0i";
  const folderId = "fold_LIZsdjTgFVbQVGYSUmYAi5vT";

  let link: z.infer<typeof crawlBitlyResultSchema> | null = null;

  try {
    const result = await fetch(`${APP_DOMAIN}/api/links/crawl/bitly`, {
      method: "POST",
      body: JSON.stringify({ domain, key, workspaceId }),
    });

    if (result.status === 404) {
      return null;
    }

    link = crawlBitlyResultSchema.parse(await result.json());
  } catch (e) {
    console.error("[Bitly] Error crawling Bitly link", e);
    return null;
  }

  if (!link) {
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
    archived: false,
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
