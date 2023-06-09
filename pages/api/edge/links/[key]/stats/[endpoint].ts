import type { NextRequest } from "next/server";
import { getStats } from "#/lib/stats";
import { getLinkViaEdge } from "#/lib/planetscale";
import { isHomeHostname } from "#/lib/utils";

export const config = {
  runtime: "edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const key = req.nextUrl.pathname.split("/")[4];
    const interval = req.nextUrl.searchParams.get("interval");
    const endpoint = req.nextUrl.searchParams.get("endpoint") as string;
    let domain = req.nextUrl.hostname;
    if (isHomeHostname(domain)) domain = "dub.sh";

    let data;
    // if the link is NOT dub.sh/github (demo link)
    if (!(domain === "dub.sh" && key === "github")) {
      data = await getLinkViaEdge(domain, key);
      // check if the link is public
      if (!data?.publicStats) {
        return new Response(`Stats for this link are not public`, {
          status: 403,
        });
      }
      // return 403 if interval is 90d or all
      if (interval === "all" || interval === "90d") {
        return new Response(`Require higher plan`, { status: 403 });
      }
    }

    const response = await getStats({
      domain,
      key,
      endpoint,
      interval,
    });

    return new Response(JSON.stringify(response), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
