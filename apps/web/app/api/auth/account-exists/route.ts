import { isWhitelistedEmail } from "@/lib/edge-config";
import { DATABASE_URL, getEdgeClient } from "@/lib/db";
import { ratelimit } from "@/lib/upstash";
import { ipAddress } from "@vercel/edge";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  const ip = ipAddress(req);
  const { success } = await ratelimit(8, "1 m").limit(`account-exists:${ip}`);
  if (!success) {
    return new Response("Don't DDoS me pls 🥺", { status: 429 });
  }

  const { email } = (await req.json()) as { email: string };

  if (!DATABASE_URL) {
    return new Response("Database connection not established", {
      status: 500,
    });
  }

  if (!process.env.NEXT_PUBLIC_IS_DUB) {
    return NextResponse.json({ accountExists: true, hasPassword: true });
  }

  const client = getEdgeClient();

  const user = await client.user.findUnique({
    where: {
      email: email
    },
    select: {
      email: true,
      passwordHash: true,
    }
  });

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
