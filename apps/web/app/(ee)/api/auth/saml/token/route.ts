import { jackson } from "@/lib/jackson";
import * as jose from "jose";
import { NextResponse } from "next/server";
import * as dummy from "openid-client";

export async function POST(req: Request) {
  console.log("token route");

  // Need these imports to fix import errors with jackson
  // https://github.com/ory/polis/blob/main/pages/api/import-hack.ts
  const unused = dummy; // eslint-disable-line @typescript-eslint/no-unused-vars
  const unused2 = jose; // eslint-disable-line @typescript-eslint/no-unused-vars

  const { oauthController } = await jackson();

  const formData = await req.formData();
  const body = Object.fromEntries(formData.entries());

  const token = await oauthController.token(body as any);

  return NextResponse.json(token);
}
