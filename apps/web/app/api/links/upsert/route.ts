import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import {
  createLink,
  processLink,
  transformLink,
  updateLink,
} from "@/lib/api/links";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getFolderWithUserOrThrow } from "@/lib/link-folder/get-folder";
import { throwIfFolderActionDenied } from "@/lib/link-folder/permissions";
import { prisma } from "@/lib/prisma";
import { NewLinkProps } from "@/lib/types";
import { createLinkBodySchema } from "@/lib/zod/schemas/links";
import { deepEqual } from "@dub/utils";
import { NextResponse } from "next/server";

// PUT /api/links/upsert – update or create a link
export const PUT = withWorkspace(
  async ({ req, headers, workspace, session }) => {
    const bodyRaw = await parseRequestBody(req);
    const body = createLinkBodySchema.parse(bodyRaw);

    if (body.folderId) {
      const { folder, folderUser } = await getFolderWithUserOrThrow({
        folderId: body.folderId,
        workspaceId: workspace.id,
        userId: session.user.id,
      });

      throwIfFolderActionDenied({
        folder,
        folderUser,
        requiredPermission: "folders.links.write",
      });
    }

    const link = await prisma.link.findFirst({
      where: {
        projectId: workspace.id,
        url: body.url,
      },
    });

    if (link) {
      if (link.folderId) {
        const { folder, folderUser } = await getFolderWithUserOrThrow({
          folderId: link.folderId,
          workspaceId: workspace.id,
          userId: session.user.id,
        });

        throwIfFolderActionDenied({
          folder,
          folderUser,
          requiredPermission: "folders.links.write",
        });
      }

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

      const {
        link: processedLink,
        error,
        code,
      } = await processLink({
        payload: updatedLink,
        workspace,
        // if domain and key are the same, we don't need to check if the key exists
        skipKeyChecks:
          link.domain === updatedLink.domain &&
          link.key.toLowerCase() === updatedLink.key?.toLowerCase(),
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

        return NextResponse.json(response, {
          headers,
        });
      } catch (error) {
        if (error.code === "P2002") {
          throw new DubApiError({
            code: "conflict",
            message: "A link with this externalId already exists.",
          });
        }

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
        if (error.code === "P2002") {
          throw new DubApiError({
            code: "conflict",
            message: "A link with this externalId already exists.",
          });
        }

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
