import jackson from "@/lib/jackson";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  const { oauthController } = await jackson();

  const body = await req.json();

  const { RelayState, SAMLResponse } = body;

  const { redirect_url } = await oauthController.samlResponse({
    RelayState,
    SAMLResponse,
  });

  if (!redirect_url) {
    throw new Error("No redirect URL found.");
  }

  redirect(redirect_url);
}
