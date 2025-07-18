import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { nanoid, R2_URL } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

// POST /api/resumes/upload-url – get a signed URL to upload a resume
export const POST = async (req: NextRequest) => {
  const origin = req.headers.get("origin");

  const corsHeaders = {
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (origin && (origin === "https://dub.co" || origin.endsWith(".dub.co")))
    corsHeaders["Access-Control-Allow-Origin"] = origin;

  const key = `resumes/${nanoid(16)}`;

  // Max 5 requests per minute
  const { success } = await ratelimit(5, "1 m").limit(`upload-resume`);
  if (!success) return new Response("Don't DDoS me pls 🥺", { status: 429 });

  const signedUrl = await storage.getSignedUrl(key);

  return NextResponse.json(
    {
      key,
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    },
    { headers: corsHeaders },
  );
};
