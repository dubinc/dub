import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { LOCALHOST_IP, nanoid } from "@dub/utils";
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

  try {
    const { contentType, contentLength } = signedUploadInputSchema.parse(
      await req.json(),
    );

    validateSignedUpload({
      contentLength,
      contentType,
      policy: "resumes",
    });

    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;

    if (ip) {
      await assertRateLimit({
        policy: RATELIMIT_POLICIES.resumeUpload,
        identifier: [ip],
      });
    }

    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key: `resumes/${nanoid(10)}`,
      contentType,
      contentLength,
    });

    return NextResponse.json(
      {
        signedUrl,
        destinationUrl,
      },
      {
        headers: CORS_HEADERS,
      },
    );
  } catch (error) {
    return handleAndReturnErrorResponse(error, CORS_HEADERS);
  }
};
