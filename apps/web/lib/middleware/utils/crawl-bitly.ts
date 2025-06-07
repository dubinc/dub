import { redis } from "@/lib/upstash";
import { DUB_HEADERS } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { parse } from "./parse";

export const crawlBitly = async (req: NextRequest) => {
  const { domain, fullKey } = parse(req);

  // bitly doesn't support the following characters: ` ~ , . < > ; ‘ : “ / \ [ ] ^ { } ( ) = + ! * @ & $ £ ? % # |
  // @see: https://support.bitly.com/hc/en-us/articles/360030780892-What-characters-are-supported-when-customizing-links
  const invalidBitlyKeyRegex = /[`~,.<>;':"/\\[\]^{}()=+!*@&$£?%#|]/;

  if (fullKey && !invalidBitlyKeyRegex.test(fullKey)) {
    const link = await fetchBitlyLink({ domain, key: fullKey });
    if (link) {
      return NextResponse.redirect(link.long_url, {
        headers: DUB_HEADERS,
        status: 302,
      });
    }
  }

  return NextResponse.redirect("https://buffer.com", {
    headers: DUB_HEADERS,
    status: 302,
  });
};

const BUFFER_WORKSPACE_ID = "cm05wnnpo000711ztj05wwdbu";

async function fetchBitlyLink({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) {
  const apiKey = await redis.get<string>(`import:bitly:${BUFFER_WORKSPACE_ID}`);

  if (!apiKey) {
    console.error(
      `[Bitly] No API key found for workspace ${BUFFER_WORKSPACE_ID}`,
    );
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
