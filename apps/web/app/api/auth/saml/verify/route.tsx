import jackson from "@/lib/jackson";
import { prisma } from "@dub/prisma";
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

  const workspace = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace not found." },
      { status: 404 },
    );
  }

  const connections = await apiController.getConnections({
    tenant: workspace.id,
    product: "Dub",
  });

  if (!connections || connections.length === 0) {
    return NextResponse.json(
      { error: "No SSO connections found for this workspace." },
      { status: 404 },
    );
  }

  const data = {
    workspaceId: workspace.id,
  };

  return NextResponse.json({ data });
}
