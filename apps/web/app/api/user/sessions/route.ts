import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { getServerSession } from "@/lib/better-auth/get-session";
import { prisma } from "@/lib/prisma";
import { userSessionSchema } from "@/lib/zod/schemas/auth";
import { NextResponse } from "next/server";

// GET /api/user/sessions – list active sessions
export const GET = withSession(async ({ session }) => {
  const current = await getServerSession();

  if (!current.session) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Login required.",
    });
  }

  const sessions = await prisma.session.findMany({
    where: {
      userId: session.user.id,
      token: { not: null },
      expiresAt: { gt: new Date() },
    },
    select: {
      id: true,
      token: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const currentToken = current.session.token;

  const payload = sessions
    .filter((row) => row.token)
    .map((row) => {
      const isCurrent = row.token === currentToken;

      return userSessionSchema.parse({
        id: row.id,
        token: isCurrent ? undefined : row.token,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        createdAt: row.createdAt,
        isCurrent,
      });
    })
    .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent));

  return NextResponse.json(payload);
});
