import { DubApiError } from "@/lib/api/errors";
import { getSession } from "@/lib/auth";
import { bitlyOAuthProvider } from "@/lib/integrations/bitly/oauth";
import { redis } from "@/lib/upstash";
import { prisma } from "@dub/prisma";
import { APP_DOMAIN } from "@dub/utils";
import { NextResponse } from "next/server";

// GET /api/callback/bitly – bitly OAuth callback
export async function GET(req: Request) {
  try {
    const session = await getSession();

    if (!session?.user.id) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized.",
      });
    }

    const {
      token: response,
      contextId: { workspaceId, folderId },
    } = await bitlyOAuthProvider.exchangeCodeForToken<{
      workspaceId: string;
      folderId?: string;
    }>(req);

    if (!response || response.includes("error")) {
      return NextResponse.redirect(APP_DOMAIN);
    }

    const params = new URLSearchParams(response);

    const [workspace, _] = await Promise.all([
      // get workspace slug from workspaceId
      prisma.project.findUnique({
        where: {
          id: workspaceId,
        },
        select: {
          slug: true,
        },
      }),

      // store access token in redis
      redis.set(`import:bitly:${workspaceId}`, params.get("access_token")),
    ]);

    const queryParams = new URLSearchParams({
      import: "bitly",
      ...(folderId ? { folderId } : {}),
    });

    const redirectUrl = workspace
      ? `${APP_DOMAIN}/${workspace.slug}?${queryParams.toString()}`
      : APP_DOMAIN;

    return NextResponse.redirect(redirectUrl);
  } catch (error) {
    console.error("[/api/callback/bitly]", error);

    return NextResponse.redirect(APP_DOMAIN);
  }
}
