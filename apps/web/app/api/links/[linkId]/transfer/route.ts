import { DubApiError } from "@/lib/api/errors";
import { linkCache } from "@/lib/api/links/cache";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { normalizeWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { recordLink } from "@/lib/tinybird";
import { prisma } from "@dub/prisma";
import { isDubDomain } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const transferLinkBodySchema = z.object({
  newWorkspaceId: z
    .string()
    .min(1, "Missing new workspace ID.")
    .transform((v) => normalizeWorkspaceId(v)),
});

// POST /api/links/[linkId]/transfer – transfer a link to another workspace
export const POST = withWorkspace(
  async ({ req, headers, session, params, workspace }) => {
    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
      linkId: params.linkId,
    });

    if (!isDubDomain(link.domain)) {
      throw new DubApiError({
        code: "bad_request",
        message:
          "You can only transfer Dub default domain links to another workspace.",
      });
    }

    if (link.folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: link.folderId,
        requiredPermission: "folders.links.write",
      });
    }

    const { newWorkspaceId } = transferLinkBodySchema.parse(await req.json());

    if (newWorkspaceId === workspace.id) {
      throw new DubApiError({
        code: "bad_request",
        message: "You cannot transfer a link to the same workspace.",
      });
    }

    const newWorkspace = await prisma.project.findUnique({
      where: { id: newWorkspaceId },
      select: {
        linksUsage: true,
        linksLimit: true,
        users: {
          where: {
            userId: session.user.id,
          },
          select: {
            role: true,
          },
        },
      },
    });

    if (!newWorkspace || newWorkspace.users.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: "New workspace not found.",
      });
    }

    if (newWorkspace.linksUsage >= newWorkspace.linksLimit) {
      throw new DubApiError({
        code: "forbidden",
        message: "New workspace has reached its link limit.",
      });
    }

    const updatedLink = await prisma.link.update({
      where: {
        id: link.id,
      },
      data: {
        projectId: newWorkspaceId,
        // reset all stats, tags, and folder when transferring link
        clicks: 0,
        leads: 0,
        sales: 0,
        saleAmount: 0,
        conversions: 0,
        lastClicked: null,
        lastLeadAt: null,
        lastConversionAt: null,
        tags: {
          deleteMany: {},
        },
        folderId: null,
      },
    });

    waitUntil(
      Promise.all([
        linkCache.set(updatedLink),

        // set the link with the old workspace ID to be deleted in Tinybird
        recordLink(link, { deleted: true }),
        // set the link with the new workspace ID to be created in Tinybird
        recordLink(updatedLink),

        // Remove the webhooks associated with the link
        prisma.linkWebhook.deleteMany({
          where: {
            linkId: link.id,
          },
        }),
      ]),
    );

    return NextResponse.json(updatedLink, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
