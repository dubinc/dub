import type { NextRequest } from "next/server";
import { getLinkViaEdge } from "@/lib/planetscale";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const key = req.nextUrl.searchParams.get("key");
    if (!key) {
      return new Response(`Missing key`, { status: 400 });
    }
    const data = await getLinkViaEdge("dub.sh", key);
    return new Response(JSON.stringify(data), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
