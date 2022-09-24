import { NextRequest } from "next/server";
import { HOME_HOSTNAMES } from "@/lib/constants";

export const parse = (req: NextRequest) => {
  let hostname = req.headers.get("host");
  if (HOME_HOSTNAMES.has(hostname)) hostname = "dub.sh";
  const path = req.nextUrl.pathname;
  const key = path.split("/")[1];
  return { hostname, path, key };
};

export const detectBot = (req: NextRequest) => {
  const url = req.nextUrl;
  if (url.searchParams.get("bot")) return true;
  const ua = req.headers.get("User-Agent");
  if (ua) {
    // Note: MetaInspector is for https://metatags.io/
    return /bot|google|baidu|bing|msn|duckduckbot|teoma|slurp|yandex|MetaInspector/i.test(
      ua
    );
  }
  return false;
};
