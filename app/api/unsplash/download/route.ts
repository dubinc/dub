import { NextResponse } from "next/server";
import { unsplash } from "../utils";

export async function POST(req: Request) {
  const { url } = await req.json();
  if (!url) return new Response("Missing url", { status: 400 });

  const response = await unsplash.photos.trackDownload({
    downloadLocation: url,
  });

  return NextResponse.json(response);
}
