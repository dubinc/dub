import { DubApiError } from "@/lib/api/errors";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const GET = withWorkspace(
  async ({ req, workspace }) => {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      throw new DubApiError({
        code: "bad_request",
        message: "Missing url parameter",
      });
    }

    try {
      const existingLinks = await prisma.link.findMany({
        where: {
          url,
          projectId: workspace.id,
        },
        select: {
          id: true,
          domain: true,
          key: true,
          url: true,
        },
      });

      return NextResponse.json({
        exists: existingLinks.length > 0,
        links: existingLinks,
      });
    } catch (error) {
      console.error(error);
      throw new DubApiError({
        code: "internal_server_error",
        message: "An unexpected error occurred",
      });
    }
  },
  {
    requiredPermissions: ["links.read"],
  },
);
