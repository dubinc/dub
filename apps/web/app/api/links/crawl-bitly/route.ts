import { redis } from "@/lib/upstash";
import { z } from "zod";

// POST /api/links/crawl-bitly - receive webhooks for Dub
export const POST = async (req: Request) => {
  const body = await req.json();

  const { domain, shortKey, workspaceId } = z
    .object({
      domain: z.string(),
      shortKey: z.string(),
      workspaceId: z.string(),
    })
    .parse(body);

  const link = await crawlBitlyLink({ domain, shortKey, workspaceId });

  return new Response(JSON.stringify(link || null));
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
    method: "HEAD",
    redirect: "manual",
    headers: {
      Host: domain,
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok && response.status !== 301 && response.status !== 302) {
    console.error(
      `[Bitly] Link ${domain}/${shortKey} not found. Falling back to API...`,
    );
    return await fetchBitlyLink({ domain, shortKey, workspaceId });
  }

  const destinationUrl = response.headers.get("location");
  if (!destinationUrl) {
    console.error(`[Bitly] No redirect URL found for ${domain}/${shortKey}`);
    return null;
  }

  console.log(`[Bitly] Found link ${domain}/${shortKey} -> ${destinationUrl}`);

  return {
    id: `${domain}/${shortKey}`,
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
      `[Bitly] Hit rate limit, returning 404 for ${domain}/${shortKey} for now...`,
    );
    return null;
  }

  return await response.json();
}
