import { auth } from "@/lib/auth";
import { getIdentityHash } from "@/lib/edge";
import { ratelimit } from "@/lib/upstash";
import { fetchWithTimeout, getUrlFromString } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Rate limit if user is not logged in
  const session = await auth();
  if (!session) {
    const identity_hash = await getIdentityHash(req);
    const { success } = await ratelimit().limit(`providers:${identity_hash}`);
    if (!success) {
      return new Response("Don't DDoS me pls 🥺", { status: 429 });
    }
  }

  const urlParam = req.nextUrl.searchParams.get("url");
  const url = getUrlFromString(urlParam || "");
  if (!url) {
    return new Response("Invalid URL", { status: 400 });
  }

  const urlObject = new URL(url);

  const domain = urlObject.hostname;
  const dns = await fetchWithTimeout(
    `https://dns.google/resolve?name=${domain}`,
  )
    .then((r) => r.json())
    .catch(() => null);

  if (
    dns &&
    dns.Answer &&
    dns.Answer.length > 0 &&
    dns.Answer.some(
      (a: { data: string }) =>
        a.data === "cname.bitly.com" ||
        a.data === "67.199.248.12" ||
        a.data === "67.199.248.13",
    )
  ) {
    return NextResponse.json({
      provider: "bitly",
    });
  }

  urlObject.pathname = "/xyz";

  const headers = await fetchWithTimeout(urlObject.toString(), {
    redirect: "manual",
  })
    .then((r) => ({
      engine: r.headers.get("engine"),
      poweredBy: r.headers.get("x-powered-by"),
    }))
    .catch(() => null);

  if (headers) {
    if (headers.engine?.includes("Rebrandly")) {
      return NextResponse.json({
        provider: "rebrandly",
      });
    }
    if (headers.poweredBy?.includes("Short.io")) {
      return NextResponse.json({
        provider: "short",
      });
    }
    if (headers.poweredBy?.includes("Dub.co")) {
      return NextResponse.json({
        provider: "dub",
      });
    }
  }

  return NextResponse.json({
    provider: "unknown",
  });
}
