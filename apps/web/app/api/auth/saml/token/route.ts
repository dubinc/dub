import jackson from "@/lib/jackson";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { oauthController } = await jackson();

  const body = await req.json();

  const response = await oauthController.token(body);

  return NextResponse.json(response);
}
