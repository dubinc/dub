import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const { event } = body;

  let response = "OK";

  switch (event) {
    case "payout.created":
      //   await payoutCreated(body);
      break;
  }

  return NextResponse.json({ response });
}
