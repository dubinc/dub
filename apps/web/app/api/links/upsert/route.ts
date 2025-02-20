import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  createLink,
  processLink,
  transformLink,
  updateLink,
} from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { NewLinkProps } from "@/lib/types";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import { createLinkBodySchema, linkEventSchema } from "@/lib/zod/schemas/links";
import { prisma } from "@dub/prisma";
import { deepEqual } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// PUT /api/links/upsert – update or create a link
export const PUT = withWorkspace(
  async ({ req, headers, workspace, session }) => {
    const bodyRaw = await parseRequestBody(req);
    const body = createLinkBodySchema.parse(bodyRaw);

    const link = await prisma.link.findFirst({
      where: {
        projectId: workspace.id,
        url: body.url,
      },
    });

    if (link) {
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

      // proceed with /api/links/[linkId] PATCH logic
      const updatedLink = {
        ...link,
        expiresAt:
          link.expiresAt instanceof Date
            ? link.expiresAt.toISOString()
            : link.expiresAt,
        geo: link.geo as NewLinkProps["geo"],
        ...body,
      };

      // if link and updatedLink are identical, return the link
      if (deepEqual(link, updatedLink)) {
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

        const response = transformLink({
          ...link,
          tags: tags.map((tag) => ({
            tag,
          })),
        });

        return NextResponse.json(response, {
          headers,
        });
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
        link.externalId?.toLowerCase() ===
        updatedLink.externalId?.toLowerCase();

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
    } else {
      // proceed with /api/links POST logic
      const { link, error, code } = await processLink({
        payload: body,
        workspace,
        userId: session.user.id,
      });

      if (error != null) {
        throw new DubApiError({
          code: code as ErrorCodes,
          message: error,
        });
      }

      try {
        const response = await createLink(link);
        return NextResponse.json(response, { headers });
      } catch (error) {
        throw new DubApiError({
          code: "unprocessable_entity",
          message: error.message,
        });
      }
    }
  },
  {
    requiredPermissions: ["links.write"],
  },
);
