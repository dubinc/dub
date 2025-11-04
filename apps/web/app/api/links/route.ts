import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, getLinksForWorkspace, processLink } from "@/lib/api/links";
import { validateLinksQueryFilters } from "@/lib/api/links/validate-links-query-filters";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  createLinkBodySchemaAsync,
  getLinksQuerySchemaExtended,
  linkEventSchema,
} from "@/lib/zod/schemas/links";
import { LOCALHOST_IP } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/links – get all links for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const filters = getLinksQuerySchemaExtended.parse(searchParams);

    const { selectedFolder, folderIds } = await validateLinksQueryFilters({
      ...filters,
      workspace,
      userId: session.user.id,
    });

    const response = await getLinksForWorkspace({
      ...filters,
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

    const body = await createLinkBodySchemaAsync.parseAsync(
      await parseRequestBody(req),
    );

    console.log(body);

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
