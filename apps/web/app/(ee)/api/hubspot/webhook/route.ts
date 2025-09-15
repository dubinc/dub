import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

// TODO:
// Verify the webhook signature using client secret
// https://developers.hubspot.com/docs/apps/legacy-apps/authentication/validating-requests

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req: AxiomRequest) => {
  console.log("Received webhook from Hubspot")

  try {
    const rawBody = await req.text();
    // console.log(rawBody)
    const body = JSON.parse(rawBody);
    console.log(body);

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});