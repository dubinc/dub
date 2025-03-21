import { getFolderIdsToFilter } from "@/lib/analytics/get-folder-ids-to-filter";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, getLinksForWorkspace, processLink } from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { verifyFolderAccess } from "@/lib/folder/permissions";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  createLinkBodySchema,
  getLinksQuerySchemaExtended,
  linkEventSchema,
} from "@/lib/zod/schemas/links";
import { Folder } from "@dub/prisma/client";
import { LOCALHOST_IP } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/links – get all links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksQuerySchemaExtended.parse(searchParams);
    const { domain, folderId, search, tagId, tagIds, tagNames, tenantId } =
      params;

    if (domain) {
      await getDomainOrThrow({ workspace, domain });
    }

    let selectedFolder: Pick<Folder, "id" | "type"> | null = null;
    if (folderId) {
      selectedFolder = await verifyFolderAccess({
        workspace,
        userId: session.user.id,
        folderId,
        requiredPermission: "folders.read",
      });
    }

    /* we only need to get the folder ids if we are:
      - not filtering by folder
      - filtering by search, domain, tags, or tenantId
    */
    let folderIds =
      !folderId && (search || domain || tagId || tagIds || tagNames || tenantId)
        ? await getFolderIdsToFilter({
            workspace,
            userId: session.user.id,
          })
        : undefined;

    if (Array.isArray(folderIds)) {
      folderIds = folderIds?.filter((id) => id !== "");
      if (folderIds.length === 0) {
        folderIds = undefined;
      }
    }

    const response = await getLinksForWorkspace({
      ...params,
      workspaceId: workspace.id,
      folderIds,
      searchMode: selectedFolder?.type === "mega" ? "exact" : "fuzzy",
    });

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);

// POST /api/links – create a new link
export const POST = withWorkspace(
  async ({ req, headers, session, workspace }) => {
    if (workspace) {
      throwIfLinksUsageExceeded(workspace);
    }

    const body = createLinkBodySchema.parse(await parseRequestBody(req));

    if (!session) {
      const ip = req.headers.get("x-forwarded-for") || LOCALHOST_IP;
      const { success } = await ratelimit(10, "1 d").limit(ip);

      if (!success) {
        throw new DubApiError({
          code: "rate_limit_exceeded",
          message:
            "Rate limited – you can only create up to 10 links per day without an account.",
        });
      }
    }

    const { link, error, code } = await processLink({
      payload: body,
      workspace,
      ...(session && { userId: session.user.id }),
    });

    if (error != null) {
      throw new DubApiError({
        code: code as ErrorCodes,
        message: error,
      });
    }

    try {
      const response = await createLink(link);

      if (response.projectId && response.userId) {
        waitUntil(
          sendWorkspaceWebhook({
            trigger: "link.created",
            workspace,
            data: linkEventSchema.parse(response),
          }),
        );
      }

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
