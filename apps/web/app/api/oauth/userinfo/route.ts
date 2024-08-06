import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { getAuthTokenOrThrow, hashToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

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
        slug: tokenRecord.project.slug,
        name: tokenRecord.project.name,
        logo: tokenRecord.project.logo,
      },
    };

    return NextResponse.json(userInfo);
  } catch (e) {
    return handleAndReturnErrorResponse(e);
  }
}
