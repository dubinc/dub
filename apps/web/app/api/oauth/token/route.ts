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

    if (validatedData.grant_type === "authorization_code") {
      return NextResponse.json(
        await exchangeAuthCodeForToken(req, validatedData),
      );
    } else if (validatedData.grant_type === "refresh_token") {
      return NextResponse.json(await refreshAccessToken(req, validatedData));
    }
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
