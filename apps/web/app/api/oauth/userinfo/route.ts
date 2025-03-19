import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { prefixWorkspaceId } from "@/lib/api/workspace-id";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// GET /api/oauth/userinfo - get user info by access token
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAuthTokenOrThrow(req);

    const tokenRecord = await prisma.restrictedToken.findFirst({
      where: {
        hashedKey: await hashToken(accessToken),
        expires: {
          gte: new Date(),
        },
        installationId: {
          not: null,
        },
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    if (!tokenRecord) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Access token not found or expired.",
      });
    }

    const { user } = tokenRecord;

    const userInfo = {
      id: user.id,
      name: user.name,
      image: user.image,
      workspace: {
        id: prefixWorkspaceId(tokenRecord.project.id),
        slug: tokenRecord.project.slug,
        name: tokenRecord.project.name,
        logo: tokenRecord.project.logo,
      },
    };

    return NextResponse.json(userInfo, {
      headers: CORS_HEADERS,
    });
  } catch (e) {
    return handleAndReturnErrorResponse(e, CORS_HEADERS);
  }
}

export const OPTIONS = () => {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
};
