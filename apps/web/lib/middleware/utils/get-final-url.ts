import { NextRequest } from "next/server";

export const getFinalUrl = (
  url: string,
  { req, clickId }: { req: NextRequest; clickId?: string },
) => {
  // query is the query string (e.g. d.to/github?utm_source=twitter -> ?utm_source=twitter)
  const searchParams = req.nextUrl.searchParams;

  // get the query params of the target url
  const urlObj = new URL(url);

  // remove dub-no-track param from the final url if it exists (used to skip tracking)
  if (urlObj.searchParams.has("dub-no-track")) {
    urlObj.searchParams.delete("dub-no-track");
    // if there's no dub-no-track param, then add clickId to the final url if it exists
    // reasoning: if you're skipping tracking, there's no point in passing the clickId anyway
  } else if (clickId) {
    // add clickId to the final url if it exists
    urlObj.searchParams.set("dub_id", clickId);
  }

  // if there are no query params, then return the target url as is (no need to parse it)
  // @ts-ignore – until https://github.com/microsoft/TypeScript/issues/54466 is fixed
  if (searchParams.size === 0) return urlObj.toString();

  // if searchParams (type: `URLSearchParams`) has the same key as target url, then overwrite it
  for (const [key, value] of searchParams) {
    urlObj.searchParams.set(key, value);
  }

  // remove qr param from the final url if the value is "1" (only used for detectQr function)
  if (urlObj.searchParams.get("qr") === "1") {
    urlObj.searchParams.delete("qr");
  }

  return urlObj.toString();
};

// Only add query params to the final URL if they are in this list
const allowedQueryParams = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
];

// Get final cleaned url for storing in TB
export const getFinalUrlForRecordClick = ({
  req,
  url,
}: {
  req: Request;
  url: string;
}) => {
  const searchParams = new URL(req.url).searchParams;
  const urlObj = new URL(url);

  // Filter out query params that are not in the allowed list
  if (searchParams.size > 0) {
    for (const [key, value] of searchParams) {
      if (allowedQueryParams.includes(key)) {
        urlObj.searchParams.set(key, value);
      }
    }
  }

  return urlObj.toString();
};
