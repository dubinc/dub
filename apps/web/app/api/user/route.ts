import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { confirmEmailChange } from "@/lib/auth/confirm-email-change";
import { storage } from "@/lib/storage";
import { uploadedImageSchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import {
  APP_DOMAIN,
  APP_HOSTNAMES,
  PARTNERS_DOMAIN,
  R2_URL,
  nanoid,
  trim,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateUserSchema = z.object({
  name: z.preprocess(trim, z.string().min(1).max(64)).optional(),
  email: z.preprocess(trim, z.string().email()).optional(),
  image: uploadedImageSchema.nullish(),
  source: z.preprocess(trim, z.string().min(1).max(32)).optional(),
  defaultWorkspace: z.preprocess(trim, z.string().min(1)).optional(),
});

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
        source: true,
        defaultWorkspace: true,
        defaultPartnerId: true,
        passwordHash: true,
        createdAt: true,
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

  return NextResponse.json({
    ...user,
    provider: account?.provider,
    hasPassword: user?.passwordHash !== null,
    passwordHash: undefined,
  });
});

// PATCH /api/user – edit a specific user
export const PATCH = withSession(async ({ req, session }) => {
  let { name, email, image, source, defaultWorkspace } =
    await updateUserSchema.parseAsync(await req.json());

  if (image) {
    const { url } = await storage.upload({
      key: `avatars/${session.user.id}_${nanoid(7)}`,
      body: image,
    });
    image = url;
  }

  if (defaultWorkspace) {
    const workspaceUser = await prisma.projectUsers.findFirst({
      where: {
        userId: session.user.id,
        project: {
          slug: defaultWorkspace,
        },
      },
    });

    if (!workspaceUser) {
      throw new DubApiError({
        code: "forbidden",
        message: `You don't have access to the workspace ${defaultWorkspace}.`,
      });
    }
  }

  // Verify email ownership if the email is being changed
  if (email && email !== session.user.email) {
    const userWithEmail = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (userWithEmail) {
      throw new DubApiError({
        code: "conflict",
        message: "Email is already in use.",
      });
    }

    const hostName = req.headers.get("host") || "";

    await confirmEmailChange({
      email: session.user.email,
      newEmail: email,
      identifier: session.user.id,
      hostName: APP_HOSTNAMES.has(hostName) ? APP_DOMAIN : PARTNERS_DOMAIN,
    });
  }

  const response = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      ...(name && { name }),
      ...(image && { image }),
      ...(source && { source }),
      ...(defaultWorkspace && { defaultWorkspace }),
    },
  });

  waitUntil(
    (async () => {
      // Delete only if a new image is uploaded and the old image exists
      if (
        image &&
        session.user.image &&
        session.user.image.startsWith(`${R2_URL}/avatars/${session.user.id}`)
      ) {
        await storage.delete({
          key: session.user.image.replace(`${R2_URL}/`, ""),
        });
      }
    })(),
  );

  return NextResponse.json(response);
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
    // if the user has a custom avatar and it is stored by their userId, delete it
    if (
      user.image &&
      user.image.startsWith(`${R2_URL}/avatars/${session.user.id}`)
    ) {
      await storage.delete({ key: user.image.replace(`${R2_URL}/`, "") });
    }
    return NextResponse.json(user);
  }
});
