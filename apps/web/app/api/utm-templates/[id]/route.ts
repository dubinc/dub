import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// DELETE /api/utm-templates/[id] – delete a UTM template for a workspace
export const DELETE = withWorkspace(
  async ({ params, workspace }) => {
    const { id } = params;
    try {
      const response = await prisma.utmTemplate.delete({
        where: {
          id,
          projectId: workspace.id,
        },
      });

      if (!response) {
        throw new DubApiError({
          code: "not_found",
          message: "UTM template not found.",
        });
      }

      return NextResponse.json({ id });
    } catch (error) {
      if (error.code === "P2025") {
        throw new DubApiError({
          code: "not_found",
          message: "UTM template not found.",
        });
      }

      throw error;
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);
