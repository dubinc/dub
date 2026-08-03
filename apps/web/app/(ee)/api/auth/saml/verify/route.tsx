import { DubApiError } from "@/lib/api/errors";
import { getIP } from "@/lib/api/utils/get-ip";
import { jackson } from "@/lib/jackson";
import { prisma } from "@/lib/prisma";
import { assertRateLimit } from "@/lib/upstash";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
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

  try {
    await assertRateLimit({
      policy: RATELIMIT_POLICIES.samlVerify,
      identifier: await getIP(),
    });
  } catch (error) {
    if (error instanceof DubApiError && error.code === "rate_limit_exceeded") {
      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 429 },
      );
    }

    throw error;
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
