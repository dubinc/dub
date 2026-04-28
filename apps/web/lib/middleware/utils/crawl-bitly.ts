import { createId } from "@/lib/api/create-id";
import { linkCache } from "@/lib/api/links/cache";
import { encodeKeyIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { recordLink } from "@/lib/tinybird";
import { publishWorkspaceLinksUsageEvent } from "@/lib/upstash/redis-streams";
import { prisma } from "@dub/prisma";
import {
  DUB_HEADERS,
  getUrlFromStringIfValid,
  linkConstructorSimple,
} from "@dub/utils";
import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

const BUFFER_WORKSPACE_ID = "cm05wnnpo000711ztj05wwdbu";
const BUFFER_USER_ID = "cm05wnd49000411ztg2xbup0i";
const BUFFER_FOLDER_ID = "fold_1JNQBVZV8P0NA0YGB11W2HHSQ";
const BUFFER_BITLY_API_KEY = process.env.BUFFER_BITLY_API_KEY;

export const crawlBitly = async (req: NextRequest, ev: NextFetchEvent) => {
  const { domain, fullKey: key } = parse(req);

  // bitly doesn't support the following characters: ` ~ , . < > ; ‘ : " / \ [ ] ^ { } ( ) = + ! * @ & $ £ ? % # |
  // @see: https://support.bitly.com/hc/en-us/articles/360030780892-What-characters-are-supported-when-customizing-links
  const invalidBitlyKeyRegex = /[`~,.<>;':"/\\[\]^{}()=+!*@&$£?%#|]/;

  if (key && !invalidBitlyKeyRegex.test(key)) {
    const link = await fetchBitlyLink({ domain, key });
    if (link) {
      const sanitizedUrl = getUrlFromStringIfValid(link.long_url);
      if (sanitizedUrl) {
        console.log(
          `[Bitly] Creating link on-demand: ${domain}/${key} (createdAt: ${link.created_at})`,
        );
        const encodedKey = encodeKeyIfCaseSensitive({ domain, key });
        ev.waitUntil(
          prisma.link
            .create({
              data: {
                id: createId({ prefix: "link_" }),
                domain,
                key: encodedKey,
                url: sanitizedUrl,
                shortLink: linkConstructorSimple({ domain, key: encodedKey }),
                projectId: BUFFER_WORKSPACE_ID,
                userId: BUFFER_USER_ID,
                folderId: BUFFER_FOLDER_ID,
                createdAt: new Date(link.created_at),
              },
            })
            .then((data) =>
              Promise.allSettled([
                recordLink(data),
                publishWorkspaceLinksUsageEvent({
                  workspaceId: BUFFER_WORKSPACE_ID,
                  linksCount: 1,
                  timestamp: new Date().toISOString(),
                }),
              ]),
            ),
        );
      }

      return NextResponse.redirect(link.long_url, {
        headers: DUB_HEADERS,
        status: 302,
      });
    }
  }

  return NextResponse.redirect("https://buffer.com", {
    headers: {
      ...DUB_HEADERS,
      "Vercel-CDN-Cache-Control": "public, s-maxage=86400",
      "Vercel-Cache-Tag": linkCache._createStaticPagesCacheKeys({
        domain,
        key,
      }),
    },
    status: 302,
  });
};

async function fetchBitlyLink({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) {
  const response = await fetch(
    `https://api-ssl.bitly.com/v4/bitlinks/${domain}/${key}`,
    {
      headers: {
        Authorization: `Bearer ${BUFFER_BITLY_API_KEY}`,
      },
    },
  );

  if (!response.ok) {
    console.log(
      `[Bitly] Hit rate limit, returning 404 for ${domain}/${key} for now...`,
    );
    return null;
  }

  const data = await response.json();
  console.log(`[Bitly] Found link ${domain}/${key} -> ${data.long_url}`);

  return data;
}
