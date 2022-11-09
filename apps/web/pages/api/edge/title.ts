import type { NextRequest } from "next/server";
import { getTitleFromUrl } from "@/lib/utils";

export const config = {
  runtime: "experimental-edge",
};

export default async function handler(req: NextRequest) {
  if (req.method === "GET") {
    const url = req.nextUrl.searchParams.get("url");
    if (!url) {
      return new Response("Missing url", { status: 400 });
    }
    const title = await getTitleFromUrl(url);
    return new Response(JSON.stringify(title), { status: 200 });
  } else {
    return new Response(`Method ${req.method} Not Allowed`, { status: 405 });
  }
}
