import { NextRequest } from "next/server";

// Only following query params are passed to the final url
const allowedQueryParams = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
];

export const getFinalUrl = (
  url: string,
  { req, clickId }: { req: NextRequest; clickId?: string },
) => {
  // query is the query string (e.g. d.to/github?utm_source=twitter -> ?utm_source=twitter)
  const searchParams = req.nextUrl.searchParams;

  // get the query params of the target url
  const urlObj = new URL(url);

  if (clickId) {
    // add clickId to the final url if it exists
    urlObj.searchParams.set("dclid", clickId);
  }

  // if there are no query params, then return the target url as is (no need to parse it)
  // @ts-ignore – until https://github.com/microsoft/TypeScript/issues/54466 is fixed
  if (searchParams.size === 0) return urlObj.toString();

  // if searchParams (type: `URLSearchParams`) has the same key as target url, then overwrite it
  for (const [key, value] of searchParams) {
    if (allowedQueryParams.includes(key)) {
      urlObj.searchParams.set(key, value);
    }
  }

  if (urlObj.searchParams.get("qr") === "1") {
    // remove qr param from the final url if the value is "1" (only used for detectQr function)
    urlObj.searchParams.delete("qr");
  }

  // construct final url
  const finalUrl = urlObj.toString();

  return finalUrl;
};
