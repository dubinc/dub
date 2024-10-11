import { DubApiError } from "@/lib/api/errors";
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
      include: {
        user: true,
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

    const existingTemplate = await prisma.utmTemplate.findFirst({
      where: {
        projectId: workspace.id,
        name: props.name,
      },
    });

    if (existingTemplate) {
      throw new DubApiError({
        code: "conflict",
        message: "A template with that name already exists.",
      });
    }

    const response = await prisma.utmTemplate.create({
      data: {
        projectId: workspace.id,
        userId: session?.user.id,
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
