import { NextResponse } from "next/server";
import { unsplash } from "../utils";
import { ipAddress } from "@vercel/edge";
import { LOCALHOST_IP } from "#/lib/constants";
import { ratelimit } from "#/lib/upstash";

export const runtime = "edge";

export async function GET(req: Request) {
  const searchParams = new URL(req.url).searchParams;
  const query = searchParams.get("query");

  if (!query) return new Response("Missing query", { status: 400 });

  const ip = ipAddress(req) || LOCALHOST_IP;
  const { success } = await ratelimit(10, "10 s").limit(ip);
  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const response = await unsplash.search.getPhotos({
    query,
  });

  if (response.errors) {
    return new Response(JSON.stringify(response.errors), {
      status: 500,
    });
  }

  const data = response.response?.results;

  return NextResponse.json(data);
}
