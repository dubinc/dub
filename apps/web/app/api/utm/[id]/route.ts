import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateUTMTemplateBodySchema } from "@/lib/zod/schemas/utm";
import { NextResponse } from "next/server";

// PATCH /api/utm/[id] – update a UTM template
export const PATCH = withWorkspace(
  async ({ req, params, workspace }) => {
    const { id } = params;
    const {
      name,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      ref,
    } = updateUTMTemplateBodySchema.parse(await req.json());

    const template = await prisma.utmTemplate.findFirst({
      where: {
        id,
        projectId: workspace.id,
      },
    });

    if (!template) {
      throw new DubApiError({
        code: "not_found",
        message: "Template not found.",
      });
    }

    try {
      const updatedTemplate = await prisma.utmTemplate.update({
        where: {
          id,
          projectId: workspace.id,
        },
        data: {
          name,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_term,
          utm_content,
          ref,
        },
      });

      return NextResponse.json(updatedTemplate);
    } catch (error) {
      if (error.code === "P2002") {
        throw new DubApiError({
          code: "conflict",
          message: "A template with that name already exists.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// DELETE /api/utm/[id] – delete a UTM template for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;

    const template = await prisma.utmTemplate.findUnique({
      where: {
        id,
        projectId: workspace.id,
      },
    });

    if (!template) {
      throw new DubApiError({
        code: "not_found",
        message: "UTM template not found.",
      });
    }

    await prisma.utmTemplate.delete({
      where: {
        id: template.id,
      },
    });

    return NextResponse.json({ id });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
