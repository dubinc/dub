import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { ratelimitOrThrow } from "@/lib/api/utils";
import { getUrlQuerySchema } from "@/lib/zod/schemas/links";
import { fetchWithTimeout } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  try {
    const { url } = getUrlQuerySchema.parse({
      url: req.nextUrl.searchParams.get("url"),
    });

    await ratelimitOrThrow(req, "providers");

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
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
