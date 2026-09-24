import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";

function getCorsHeaders(req: NextRequest) {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "POST",
    "Access-Control-Allow-Headers": "Content-Type",
  });

  const origin = req.headers.get("origin");
  if (origin && (origin === "https://dub.co" || origin.endsWith(".dub.co"))) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
}

// POST /api/resumes/upload-url – get a signed URL to upload a resume
export const POST = async (req: NextRequest) => {
  const corsHeaders = getCorsHeaders(req);

  try {
    const { contentType, contentLength } = signedUploadInputSchema.parse(
      await req.json(),
    );

    validateSignedUpload({
      contentLength,
      contentType,
      policy: "resumes",
    });

    // Max 5 requests per minute
    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    const { success } = await ratelimit(5, "1 m").limit(`upload-resume:${ip}`);

    if (!success) {
      return new Response("Don't DDoS me pls 🥺", {
        status: 429,
        headers: corsHeaders,
      });
    }

    const key = `resumes/${nanoid(16)}`;
    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key,
      contentType,
      contentLength,
    });

    return NextResponse.json(
      {
        key,
        signedUrl,
        destinationUrl,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, corsHeaders);
  }
};
