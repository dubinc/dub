import { COMMON_CORS_HEADERS } from "@/lib/api/cors";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { tokenGrantSchema } from "@/lib/zod/schemas/oauth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthCodeForToken } from "./exchange-code-for-token";
import { refreshAccessToken } from "./refresh-access-token";

export const maxDuration = 30;

// POST /api/oauth/token - Exchange authorization code for access token and refresh access token
export async function POST(req: NextRequest) {
  try {
    const formData = Object.fromEntries(await req.formData());
    const validatedData = tokenGrantSchema.parse(formData);

    if (validatedData.grant_type === "authorization_code") {
      const data = await exchangeAuthCodeForToken(req, validatedData);
      return NextResponse.json(data, {
        headers: COMMON_CORS_HEADERS,
      });
    } else if (validatedData.grant_type === "refresh_token") {
      const data = await refreshAccessToken(req, validatedData);
      return NextResponse.json(data, {
        headers: COMMON_CORS_HEADERS,
      });
    }
  } catch (error) {
    return handleAndReturnErrorResponse(error, COMMON_CORS_HEADERS);
  }
}

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: COMMON_CORS_HEADERS,
  });
};
