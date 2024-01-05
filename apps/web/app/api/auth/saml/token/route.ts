import jackson from "@/lib/jackson";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { oauthController } = await jackson();

  const formData = await req.formData();
  const body = Object.fromEntries(formData.entries());

  const token = await oauthController.token(body as any);

  return NextResponse.json(token);
}
