import { redis } from "@/lib/upstash";
import { NextResponse } from "next/server";
import { z } from "zod";

// POST /api/links/crawl/bitly – crawl a bitly link
export const POST = async (req: Request) => {
  const body = await req.json();

  const { domain, key, workspaceId } = z
    .object({
      domain: z.string(),
      key: z.string(),
      workspaceId: z.string(),
    })
    .parse(body);

  // bitly doesn't support the following characters: ` ~ , . < > ; ‘ : “ / \ [ ] ^ { } ( ) = + ! * @ & $ £ ? % # |
  // @see: https://support.bitly.com/hc/en-us/articles/360030780892-What-characters-are-supported-when-customizing-links
  const invalidBitlyKeyRegex = /[`~,.<>;':"/\\[\]^{}()=+!*@&$£?%#|]/;
  if (invalidBitlyKeyRegex.test(key)) {
    return NextResponse.json({ error: "Invalid key" }, { status: 400 });
  }

  const link = await crawlBitlyLink({ domain, key, workspaceId });

  return link
    ? NextResponse.json(link)
    : NextResponse.json({ error: "Not found" }, { status: 404 });
};

async function crawlBitlyLink({
  domain,
  key,
  workspaceId,
}: {
  domain: string;
  key: string;
  workspaceId: string;
}) {
  const response = await fetch(`https://bit.ly/${key}`, {
    method: "HEAD",
    redirect: "manual",
    headers: {
      Host: domain,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  // If the link is not found, fallback to the API
  if (!response.ok && response.status !== 301 && response.status !== 302) {
    console.error(
      `[Bitly] Link ${domain}/${key} not found. Falling back to API...`,
    );
    return await fetchBitlyLink({ domain, key, workspaceId });
  }

  const destinationUrl = response.headers.get("location");
  if (!destinationUrl) {
    console.error(`[Bitly] No redirect URL found for ${domain}/${key}`);
    return null;
  }

  console.log(`[Bitly] Found link ${domain}/${key} -> ${destinationUrl}`);

  return {
    id: `${domain}/${key}`,
    long_url: destinationUrl,
    created_at: new Date().toISOString(),
  };
}

async function fetchBitlyLink({
  domain,
  key,
  workspaceId,
}: {
  domain: string;
  key: string;
  workspaceId: string;
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

  return await response.json();
}
