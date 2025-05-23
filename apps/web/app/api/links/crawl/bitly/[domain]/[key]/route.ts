import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { DUB_HEADERS, getUrlFromStringIfValid } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

const workspaceId = "cm05wnnpo000711ztj05wwdbu";

// GET /api/links/crawl/bitly – crawl a bitly link and redirect to the destination if exists
export const GET = async (_req: NextRequest, { params }) => {
  const { domain, key } = z
    .object({
      domain: z.string(),
      key: z.string(),
    })
    .parse(params);

  // bitly doesn't support the following characters: ` ~ , . < > ; ‘ : “ / \ [ ] ^ { } ( ) = + ! * @ & $ £ ? % # |
  // @see: https://support.bitly.com/hc/en-us/articles/360030780892-What-characters-are-supported-when-customizing-links
  const invalidBitlyKeyRegex = /[`~,.<>;':"/\\[\]^{}()=+!*@&$£?%#|]/;

  if (key && !invalidBitlyKeyRegex.test(key)) {
    const link = await fetchBitlyLink({ domain, key });
    if (link) {
      const sanitizedUrl = getUrlFromStringIfValid(link.long_url);

      if (sanitizedUrl) {
        return NextResponse.redirect(sanitizedUrl, {
          headers: DUB_HEADERS,
          status: 302,
        });
      }
    }
  }

  return NextResponse.redirect("https://buffer.com", {
    headers: DUB_HEADERS,
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
  const apiKey = await redis.get<string>(`import:bitly:${workspaceId}`);

  if (!apiKey) {
    console.error(`[Bitly] No API key found for workspace ${workspaceId}`);
    return null;
  }

  const response = await fetch(
    `https://api-ssl.bitly.com/v4/bitlinks/${domain}/${key}`,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
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
