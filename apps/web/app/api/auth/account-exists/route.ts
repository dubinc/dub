import { isWhitelistedEmail } from "@/lib/edge-config";
import { conn } from "@/lib/planetscale";
import { ratelimit } from "@/lib/upstash";
import { ipAddress } from "@vercel/functions";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const ip = ipAddress(req);
  const { success } = await ratelimit(8, "1 m").limit(`account-exists:${ip}`);
  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const { email } = (await req.json()) as { email: string };

  if (!process.env.NEXT_PUBLIC_IS_DUB) {
    return NextResponse.json({ accountExists: true, hasPassword: true });
  }

  const user = await conn
    .execute("SELECT email, passwordHash FROM User WHERE email = ?", [email])
    .then((res) => res.rows[0]);

  if (user) {
    return NextResponse.json({
      accountExists: true,
      hasPassword: !!user.passwordHash,
    });
  }

  const whitelisted = await isWhitelistedEmail(email);
  if (whitelisted) {
    return NextResponse.json({
      accountExists: true,
      hasPassword: false,
    });
  }

  return NextResponse.json({ accountExists: false, hasPassword: false });
}
