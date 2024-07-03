import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { tokenGrantSchema } from "@/lib/zod/schemas/oauth";
import { NextRequest, NextResponse } from "next/server";
import { exchangeAuthCodeForToken } from "./exchange-code-for-token";
import { refreshAccessToken } from "./refresh-access-token";

// POST /api/oauth/token - Exchange authorization code for access token and refresh access token
export async function POST(req: NextRequest) {
  try {
    const formData = Object.fromEntries(await req.formData());
    const validatedData = tokenGrantSchema.parse(formData);
    const { grant_type } = validatedData;

    if (grant_type === "authorization_code") {
      const response = await exchangeAuthCodeForToken(req, validatedData);
      return NextResponse.json(response);
    } else if (grant_type === "refresh_token") {
      const response = await refreshAccessToken(req, validatedData);
      return NextResponse.json(response);
    }
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
