import { NextRequest, NextResponse } from "next/server";

// POST /api/oauth/token - exchange `code` for an access token
export async function GET(req: NextRequest) {
  const response = {
    id: "xxx",
    email: "kiran@dub.co",
    name: "Kiran",
    avatar_url: null,
  };

  return NextResponse.json(response);
}
