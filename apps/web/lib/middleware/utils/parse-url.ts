import { SHORT_DOMAIN } from "@dub/utils";

// Copied from `parse` function and modified to accept a url string
export const parseUrl = (initialUrl: string) => {
  const url = new URL(initialUrl);
  let domain = url.hostname;
  domain = domain.replace("www.", ""); // remove www. from domain
  if (domain === "dub.localhost:8888" || domain.endsWith(".vercel.app")) {
    // for local development and preview URLs
    domain = SHORT_DOMAIN;
  }

  // path is the path of the URL (e.g. dub.co/stats/github -> /stats/github)
  let path = url.pathname;

  // fullPath is the full URL path (along with search params)
  const searchParams = url.searchParams.toString();
  const fullPath = `${path}${
    searchParams.length > 0 ? `?${searchParams}` : ""
  }`;

  // Here, we are using decodeURIComponent to handle foreign languages like Hebrew
  const key = decodeURIComponent(path.split("/")[1]); // key is the first part of the path (e.g. dub.co/stats/github -> stats)
  const fullKey = decodeURIComponent(path.slice(1)); // fullKey is the full path without the first slash (to account for multi-level subpaths, e.g. dub.sh/github/repo -> github/repo)

  return {
    domain,
    path,
    fullPath,
    key,
    fullKey,
    searchParams: url.searchParams,
  };
};
