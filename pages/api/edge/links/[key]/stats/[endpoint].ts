import type { NextRequest } from "next/server";
import { getStats } from "@/lib/stats";
import { getLinkViaEdge } from "@/lib/planetscale";
import { isHomeHostname } from "@/lib/utils";

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

    // don't need to check if the link has public stats if the link is dub.sh/github (demo link)
    if (!(domain === "dub.sh" || key === "github")) {
      const data = await getLinkViaEdge(domain, key);
      if (!data?.publicStats) {
        return new Response(`Stats for this link are not public`, {
          status: 403,
        });
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
