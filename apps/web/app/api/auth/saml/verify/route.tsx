import jackson from "@/lib/jackson";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { apiController } = await jackson();

  const { slug } = await req.json();

  if (!slug) {
    return NextResponse.json(
      { error: "No project slug provided." },
      { status: 400 },
    );
  }

  const project = await prisma.project.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const connections = await apiController.getConnections({
    tenant: project.id,
    product: "Dub",
  });

  if (!connections || connections.length === 0) {
    return NextResponse.json(
      { error: "No SSO connections found for this project." },
      { status: 404 },
    );
  }

  const data = {
    projectId: project.id,
  };

  return NextResponse.json({ data });
}
