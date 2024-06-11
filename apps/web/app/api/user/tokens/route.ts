import { hashToken, withSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import APIKeyCreated from "emails/api-key-created";
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

// POST /api/user/tokens – create a new token for a specific user
export const POST = withSession(async ({ req, session }) => {
  const { name } = await req.json();
  const token = nanoid(24);
  const hashedKey = await hashToken(token);
  // take first 3 and last 4 characters of the key
  const partialKey = `${token.slice(0, 3)}...${token.slice(-4)}`;

  await prisma.token.create({
    data: {
      name,
      hashedKey,
      partialKey,
      userId: session.user.id,
    },
  });

  waitUntil(
    sendEmail({
      email: session.user.email,
      subject: "New API Key Created",
      react: APIKeyCreated({
        email: session.user.email,
        apiKeyName: name,
      }),
    }),
  );

  return NextResponse.json({ token });
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
