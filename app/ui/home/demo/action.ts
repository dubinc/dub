"use server";

import { setRandomKey } from "#/lib/upstash";
import { isBlacklistedDomain } from "#/lib/edge-config";

export async function createLink(data: FormData) {
  const url = data.get("url") as string | undefined;

  if (!url) {
    return {
      error: "Missing URL",
    };
  }
  const domainBlacklisted = await isBlacklistedDomain(url);
  if (domainBlacklisted) {
    return {
      error: "Invalid URL",
    };
  }
  const { response, key } = await setRandomKey(url);
  if (response === "OK") {
    // if key was successfully added
    return {
      key,
      url,
    };
  } else {
    return {
      error: "Failed to create link",
    };
  }
}
