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

  return unsplash.search
    .getPhotos({
      query,
    })
    .then((result) => {
      if (result.errors) {
        // handle error here
        console.log("error occurred: ", result.errors[0]);
        return new Response("Unsplash error", { status: 400 });
      } else {
        const data = result.response;
        return NextResponse.json(data.results);
      }
    })
    .catch((err) => {
      console.log("err", err);
      return new Response("Unsplash rate limit exceeded", { status: 429 });
    });
}
