import { DubApiError, ErrorCodes } from "@/lib/api/errors";
import { createLink, processLink } from "@/lib/api/links";
import { throwIfLinksUsageExceeded } from "@/lib/api/links/usage-checks";
import { createQr } from "@/lib/api/qrs/create-qr";
import { getQrs } from "@/lib/api/qrs/get-qrs";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { ratelimit } from "@/lib/upstash";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  getLinksQuerySchemaBase,
  linkEventSchema,
} from "@/lib/zod/schemas/links";
import { createQrBodySchema } from "@/lib/zod/schemas/qrs";
import { LOCALHOST_IP } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/qrs – create a new qr
export const POST = withWorkspace(
  async ({ req, headers, session, workspace }) => {
    if (workspace) {
      throwIfLinksUsageExceeded(workspace);
    }

    console.log('here create qr');

    const body = createQrBodySchema.parse(await parseRequestBody(req));
    console.log("POST /api/qrs body:", body);
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
      payload: body.link,
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
      const createdLink = await createLink(link);

      if (createdLink.projectId && createdLink.userId) {
        waitUntil(
          sendWorkspaceWebhook({
            trigger: "link.created",
            workspace,
            data: linkEventSchema.parse(createdLink),
          }),
        );
      }

      const createdQr = await createQr(
        body,
        createdLink.id,
        createdLink.userId,
      );

      return NextResponse.json(createdQr, {
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

// GET /api/qrs – get all qrs for a workspace
export const GET = withWorkspace(
  async ({ headers, searchParams, workspace, session }) => {
    const params = getLinksQuerySchemaBase.parse(searchParams);

    const response = await getQrs(params);

    return NextResponse.json(response, {
      headers,
    });
  },
  {
    requiredPermissions: ["links.read"],
  },
);
