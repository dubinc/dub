import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, getLinksForWorkspace, processLink } from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { checkFolderPermission } from "@/lib/folder/permissions";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  createLinkBodySchema,
  getLinksQuerySchemaExtended,
  linkEventSchema,
} from "@/lib/zod/schemas/links";
import { LOCALHOST_IP, getSearchParamsWithArray } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, dub-anonymous-link-creation",
};

// GET /api/links – get all links for a workspace
export const GET = withWorkspace(
  async ({ req, headers, workspace, session }) => {
    const searchParams = getSearchParamsWithArray(req.url);
    const params = getLinksQuerySchemaExtended.parse(searchParams);

    if (params.domain) {
      await getDomainOrThrow({ workspace, domain: params.domain });
    }

    if (params.folderId) {
      await checkFolderPermission({
        folderId,
        workspaceId: workspace.id,
        userId: session.user.id,
        requiredPermission: "folders.read",
      });
    }

    const response = await getLinksForWorkspace({
      ...params,
      workspaceId: workspace.id,
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
        headers: {
          ...headers,
          ...CORS_HEADERS,
        },
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

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
