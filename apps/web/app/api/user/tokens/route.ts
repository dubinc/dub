import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/user/tokens – get all tokens for a specific user
export const GET = withSession(async ({ session }) => {
  const tokens = await prisma.token.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      partialKey: true,
      createdAt: true,
      lastUsed: true,
    },
    orderBy: [
      {
        lastUsed: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
  return NextResponse.json(tokens);
});

// DELETE /api/user/tokens – delete a token for a specific user
export const DELETE = withSession(async ({ searchParams, session }) => {
  const { id } = searchParams;
  const response = await prisma.token.delete({
    where: {
      id,
      userId: session.user.id,
    },
  });
  return NextResponse.json(response);
});
