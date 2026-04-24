import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  bulkCreateLinks,
  bulkDeleteLinks,
  bulkUpdateLinks,
  processLink,
} from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import {
  bulkCreateLinksBodySchema,
  bulkDeleteLinksBodySchema,
  bulkUpdateLinksBodySchema,
} from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/links/bulk – bulk create up to 100 links
export const POST = withWorkspace(
  async ({ req, workspace, headers, session }) => {
    if (!workspace) {
      throw new DubApiError({
        code: "not_found",
        message: "Workspace not found.",
      });
    }

    throwIfLinksUsageExceeded(workspace);

    const links = await bulkCreateLinksBodySchema.parseAsync(
      await parseRequestBody(req),
    );
    if (
      workspace.linksUsage + links.length > workspace.linksLimit &&
      workspace.plan !== "enterprise" //  don't throw an error for enterprise plans
    ) {
      throw new DubApiError({
        code: "exceeded_limit",
        message:
          "You have exceeded your links limit. Please upgrade your plan to create more links.",
      });
    }

    const processedLinks = await Promise.all(
      links.map(async (payload) => {
        const { link, error, code } = await processLink({
          payload,
          workspace,
          userId: session?.user.id,
        });

        if (error) {
          throw new DubApiError({
            code: code as ErrorCodes,
            message: error,
          });
        }

        return link;
      }),
    );

    const response = await bulkCreateLinks({
      links: processedLinks,
    });

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// PATCH /api/links/bulk – bulk update up to 100 links with the same data
export const PATCH = withWorkspace(
  async ({ req, workspace, headers, session }) => {
    const { linkIds, externalIds, data } =
      await bulkUpdateLinksBodySchema.parseAsync(await parseRequestBody(req));

    if (linkIds.length === 0 && externalIds.length === 0) {
      return NextResponse.json("No links to update", { headers });
    }

    const response = await bulkUpdateLinks({
      linkIds,
      data,
      workspaceId: workspace?.id!,
    });

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// DELETE /api/links/bulk – bulk delete up to 100 links
export const DELETE = withWorkspace(
  async ({ req, workspace, headers }) => {
    const { linkIds, externalIds } = await bulkDeleteLinksBodySchema.parseAsync(
      await parseRequestBody(req),
    );

    if (linkIds.length === 0 && externalIds.length === 0) {
      return NextResponse.json("No links to delete", { headers });
    }

    const links = await prisma.link.findMany({
      where: {
        OR: [
          { id: { in: linkIds } },
          {
            projectId: workspace?.id,
            externalId: { in: externalIds },
          },
        ],
        projectId: workspace?.id,
      },
    });

    const { count: deletedCount } = await prisma.link.deleteMany({
      where: {
        id: { in: links.map((link) => link.id) },
        projectId: workspace?.id,
      },
    });

    waitUntil(bulkDeleteLinks(links));

    return NextResponse.json(
      {
        deletedCount,
      },
      { headers },
    );
  },
  {
    requiredPermissions: ["links.write"],
  },
);
