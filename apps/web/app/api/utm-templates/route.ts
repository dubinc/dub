import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createUTMTemplateBodySchema } from "@/lib/zod/schemas/utm-templates";
import { NextResponse } from "next/server";

// GET /api/utm-templates - get all UTM templates for a workspace
export const GET = withWorkspace(
  async ({ workspace, headers }) => {
    const templates = await prisma.utmTemplate.findMany({
      where: {
        projectId: workspace.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 50,
    });

    return NextResponse.json(templates, { headers });
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// POST /api/utm-templates - create or update a UTM template for a workspace
export const POST = withWorkspace(
  async ({ req, workspace, session, headers }) => {
    const props = createUTMTemplateBodySchema.parse(await req.json());

    const response = await prisma.utmTemplate.upsert({
      where: {
        projectId_name: {
          projectId: workspace.id,
          name: props.name,
        },
      },
      create: {
        projectId: workspace.id,
        userId: session?.user.id,
        ...props,
      },
      update: {
        ...props,
      },
    });

    return NextResponse.json(response, {
      headers,
      status: 201,
    });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
