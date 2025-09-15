import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { HUBSPOT_CLIENT_SECRET } from "@/lib/integrations/hubspot/constants";
import crypto from "crypto";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req: AxiomRequest) => {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("X-HubSpot-Signature");

    // Verify webhook signature
    if (!signature) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing X-HubSpot-Signature header.",
      });
    }

    if (!HUBSPOT_CLIENT_SECRET) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Missing HUBSPOT_CLIENT_SECRET environment variable.",
      });
    }

    // Create expected hash: client_secret + request_body
    const sourceString = HUBSPOT_CLIENT_SECRET + rawBody;
    const expectedHash = crypto
      .createHash("sha256")
      .update(sourceString)
      .digest("hex");

    console.log("Expected hash:", expectedHash);
    console.log("Signature:", signature);

    // Compare with provided signature
    if (signature !== expectedHash) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Invalid webhook signature.",
      });
    }

    const body = JSON.parse(rawBody);
    console.log("Verified webhook payload:", body);

    return NextResponse.json({ message: "Webhook received." });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
