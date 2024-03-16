import jackson from "@/lib/jackson";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { oauthController } = await jackson();

  const authHeader = req.headers.get("Authorization");

  if (!authHeader) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }

  const token = authHeader.split(" ")[1];

  const user = await oauthController.userInfo(token);

  return NextResponse.json(user);
}
