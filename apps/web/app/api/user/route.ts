import { withSession } from "@/lib/auth";
import { unsubscribe } from "@/lib/flodesk";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { redis } from "@/lib/upstash";
import { trim } from "@dub/utils";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/user – get a specific user
export const GET = withSession(async ({ session }) => {
  const [user, account] = await Promise.all([
    prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        subscribed: true,
        createdAt: true,
        defaultWorkspace: true,
        source: true,
        passwordHash: true,
      },
    }),

    prisma.account.findFirst({
      where: {
        userId: session.user.id,
      },
      select: {
        provider: true,
      },
    }),
  ]);

  const migratedWorkspace = await redis.hget(
    "migrated_links_users",
    session.user.id,
  );

  if (migratedWorkspace) {
    await redis.hdel("migrated_links_users", session.user.id);
  }

  return NextResponse.json({
    ...user,
    migratedWorkspace,
    provider: account?.provider,
    hasPassword: user?.passwordHash !== null,
    passwordHash: undefined,
  });
});

const updateUserSchema = z.object({
  name: z.preprocess(trim, z.string().min(1).max(64)).optional(),
  email: z.preprocess(trim, z.string().email()).optional(),
  image: z.string().url().optional(),
  source: z.preprocess(trim, z.string().min(1).max(32)).optional(),
  defaultWorkspace: z.preprocess(trim, z.string().min(1)).optional(),
});

// PATCH /api/user – edit a specific user
export const PATCH = withSession(async ({ req, session }) => {
  let { name, email, image, source, defaultWorkspace } =
    await updateUserSchema.parseAsync(await req.json());

  try {
    if (image) {
      const { url } = await storage.upload(`avatars/${session.user.id}`, image);
      image = url;
    }
    const response = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(image && { image }),
        ...(source && { source }),
        ...(defaultWorkspace && { defaultWorkspace }),
      },
    });
    return NextResponse.json(response);
  } catch (error) {
    if (error.code === "P2002") {
      // return res.status(422).end("Email is already in use.");
      return NextResponse.json(
        {
          error: {
            code: "conflict",
            message: "Email is already in use.",
          },
        },
        { status: 422 },
      );
    }
    return NextResponse.json({ error }, { status: 500 });
  }
});

export const PUT = PATCH;

// DELETE /api/user – delete a specific user
export const DELETE = withSession(async ({ session }) => {
  const userIsOwnerOfWorkspaces = await prisma.projectUsers.findMany({
    where: {
      userId: session.user.id,
      role: "owner",
    },
  });
  if (userIsOwnerOfWorkspaces.length > 0) {
    return new Response(
      "You must transfer ownership of your workspaces or delete them before you can delete your account.",
      { status: 422 },
    );
  } else {
    const user = await prisma.user.delete({
      where: {
        id: session.user.id,
      },
    });
    const response = await Promise.allSettled([
      // if the user has a custom avatar, delete it
      user.image?.startsWith(process.env.STORAGE_BASE_URL as string) &&
        storage.delete(`avatars/${session.user.id}`),
      unsubscribe(session.user.email),
    ]);
    return NextResponse.json(response);
  }
});
