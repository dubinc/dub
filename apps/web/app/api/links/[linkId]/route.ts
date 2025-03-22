import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  deleteLink,
  processLink,
  transformLink,
  updateLink,
} from "@/lib/api/links";
import { getLinkOrThrow } from "@/lib/api/links/get-link-or-throw";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { NewLinkProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { linkEventSchema, updateLinkBodySchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { deepEqual, UTMTags } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/links/[linkId] – get a link
export const GET = withWorkspace(
  async ({ headers, workspace, params, session }) => {
    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
      linkId: params.linkId,
    });

    if (link.folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: link.folderId,
        requiredPermission: "folders.read",
      });
    }

    const tags = await prisma.tag.findMany({
      where: {
        links: {
          some: {
            linkId: link.id,
          },
        },
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
    });

    const response = transformLink(
      {
        ...link,
        tags: tags.map((tag) => {
          return { tag };
        }),
      },
      { skipDecodeKey: true },
    );

    return NextResponse.json(response, { headers });
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// PATCH /api/links/[linkId] – update a link
export const PATCH = withWorkspace(
  async ({ req, headers, workspace, params, session }) => {
    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
      linkId: params.linkId,
    });

    const body = updateLinkBodySchema.parse(await parseRequestBody(req)) || {};

    await Promise.all([
      ...(link.folderId
        ? [
            verifyFolderAccess({
              workspace,
              userId: session.user.id,
              folderId: link.folderId,
              requiredPermission: "folders.links.write",
            }),
          ]
        : []),

      ...(body.folderId
        ? [
            verifyFolderAccess({
              workspace,
              userId: session.user.id,
              folderId: body.folderId,
              requiredPermission: "folders.links.write",
            }),
          ]
        : []),
    ]);

    // Add body onto existing link but maintain NewLinkProps form for processLink
    const updatedLink = {
      ...link,
      expiresAt:
        link.expiresAt instanceof Date
          ? link.expiresAt.toISOString()
          : link.expiresAt,
      geo: link.geo as NewLinkProps["geo"],
      ...body,
      // for UTM tags, we only pass them to processLink if they have changed from their previous value
      // or else they will override any changes to the UTM params in the destination URL
      ...Object.fromEntries(
        UTMTags.map((tag) => [
          tag,
          body[tag] === link[tag] ? undefined : body[tag],
        ]),
      ),

      // When root domain
      ...(link.key === "_root" && {
        domain: link.domain,
        key: link.key,
      }),
    };

    // if link and updatedLink are identical, return the link
    if (deepEqual(link, updatedLink)) {
      return NextResponse.json(link, { headers });
    }

    if (updatedLink.projectId !== link?.projectId) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "Transferring links to another workspace is only allowed via the /links/[linkId]/transfer endpoint.",
      });
    }

    // if domain and key are the same, we don't need to check if the key exists
    const skipKeyChecks =
      link.domain === updatedLink.domain &&
      link.key.toLowerCase() === updatedLink.key?.toLowerCase();

    // if externalId is the same, we don't need to check if it exists
    const skipExternalIdChecks =
      link.externalId?.toLowerCase() === updatedLink.externalId?.toLowerCase();

    const {
      link: processedLink,
      error,
      code,
    } = await processLink({
      payload: updatedLink,
      workspace,
      skipKeyChecks,
      skipExternalIdChecks,
      skipFolderChecks: true,
    });

    if (error) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    try {
      const response = await updateLink({
        oldLink: {
          domain: link.domain,
          key: link.key,
          image: link.image,
        },
        updatedLink: processedLink,
      });

      waitUntil(
        sendWorkspaceWebhook({
          trigger: "link.updated",
          workspace,
          data: linkEventSchema.parse(response),
        }),
      );

      return NextResponse.json(response, {
        headers,
      });
    } catch (error) {
      throw new DubApiError({
        code: "unprocessable_entity",
        message: error.message,
      });
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);

// backwards compatibility
export const PUT = PATCH;

// DELETE /api/links/[linkId] – delete a link
export const DELETE = withWorkspace(
  async ({ headers, params, workspace, session }) => {
    const link = await getLinkOrThrow({
      workspaceId: workspace.id,
      linkId: params.linkId,
    });

    if (link.folderId) {
      await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId: link.folderId,
        requiredPermission: "folders.links.write",
      });
    }

    const response = await deleteLink(link.id);

    waitUntil(
      sendWorkspaceWebhook({
        trigger: "link.deleted",
        workspace,
        data: linkEventSchema.parse(response),
      }),
    );

    return NextResponse.json({ id: link.id }, { headers });
  },
  {
    requiredPermissions: ["links.write"],
  },
);
