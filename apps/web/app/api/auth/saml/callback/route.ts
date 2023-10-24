import jackson from "@/lib/jackson";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { oauthController } = await jackson();

  const formData = await req.formData();

  const RelayState = formData.get("RelayState");
  const SAMLResponse = formData.get("SAMLResponse");

  const { redirect_url } = await oauthController.samlResponse({
    RelayState: RelayState as string,
    SAMLResponse: SAMLResponse as string,
  });

  if (!redirect_url) {
    throw new Error("No redirect URL found.");
  }

  return NextResponse.redirect(redirect_url, {
    status: 302,
  });
}
