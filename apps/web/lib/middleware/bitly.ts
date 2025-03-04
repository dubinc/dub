import { APP_DOMAIN } from "@dub/utils";

// Create a new Bitly-hosted link to Dub on-demand (e.g. buff.ly)
export const importBitlyLink = async ({
  domain,
  key,
}: {
  domain: string;
  key: string;
}) => {
  try {
    const result = await fetch(`${APP_DOMAIN}/api/links/crawl/bitly`, {
      method: "POST",
      body: JSON.stringify({ domain, key }),
    });

    if (result.status === 404) {
      return null;
    }

    return await result.json();
  } catch (e) {
    console.error("[Bitly] Error crawling Bitly link", e);
    return null;
  }
};
