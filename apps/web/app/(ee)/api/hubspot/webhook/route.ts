import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { AxiomRequest, withAxiom } from "next-axiom";
import { NextResponse } from "next/server";

// POST /api/hubspot/webhook – listen to webhook events from Hubspot
export const POST = withAxiom(async (req: AxiomRequest) => {
  console.log("Received webhook from Hubspot")

  try {
    const rawBody = await req.text();
    console.log(rawBody)

    return NextResponse.json("OK");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});