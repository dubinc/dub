import { shouldApplyRateLimit } from "@/lib/api/environment";
import { jackson } from "@/lib/jackson";
import { prisma } from "@/lib/prisma";
import { ratelimit } from "@/lib/upstash";
import { LOCALHOST_IP } from "@dub/utils";
import { ipAddress } from "@vercel/functions";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { apiController } = await jackson();

  const { slug } = await req.json();

  if (!slug) {
    return NextResponse.json(
      { error: "No workspace slug provided." },
      { status: 400 },
    );
  }

  if (shouldApplyRateLimit) {
    const ip = process.env.VERCEL === "1" ? ipAddress(req) : LOCALHOST_IP;
    const { success } = await ratelimit(10, "1 m").limit(`saml-verify:${ip}`);

    if (!success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }
  }

  const workspace = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json(
      { error: "No SSO connection found for this workspace." },
      { status: 404 },
    );
  }

  const connections = await apiController.getConnections({
    tenant: workspace.id,
    product: "Dub",
  });

  if (!connections || connections.length === 0) {
    return NextResponse.json(
      { error: "No SSO connection found for this workspace." },
      { status: 404 },
    );
  }

  const data = {
    workspaceId: workspace.id,
  };

  return NextResponse.json({ data });
}
