import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP, nanoid, R2_URL } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";

const CORS_HEADERS = new Headers({
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
});

// POST /api/resumes/upload-url – get a signed URL to upload a resume
export const POST = async (req: NextRequest) => {
  const origin = req.headers.get("origin");

  if (origin && (origin === "https://dub.co" || origin.endsWith(".dub.co"))) {
    CORS_HEADERS["Access-Control-Allow-Origin"] = origin;
  }

  // Max 5 requests per minute
  const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
  const { success } = await ratelimit(5, "1 m").limit(`upload-resume:${ip}`);

  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const key = `resumes/${nanoid(16)}`;
  const signedUrl = await storage.getSignedUrl(key);

  return NextResponse.json(
    {
      key,
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    },
    { headers: CORS_HEADERS },
  );
};
