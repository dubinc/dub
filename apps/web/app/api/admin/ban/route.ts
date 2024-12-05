import { deleteWorkspaceAdmin } from "@/lib/api/workspaces";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { prisma } from "@/lib/prisma";
import { unsubscribe } from "@/lib/resend";
import { isStored, storage } from "@/lib/storage";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/admin/ban
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      id: true,
      email: true,
      image: true,
      projects: {
        where: {
          role: "owner",
        },
        select: {
          project: {
            select: {
              id: true,
              slug: true,
              logo: true,
              stripeId: true,
            },
          },
        },
      },
    },
  });

  if (!user?.email) {
    return new Response("No user found", { status: 404 });
  }

  waitUntil(
    Promise.allSettled([
      ...user.projects.map(({ project }) => deleteWorkspaceAdmin(project)),
      // delete user
      prisma.user.delete({
        where: {
          id: user.id,
        },
      }),
      // if the user has a custom avatar, delete it
      user.image &&
        isStored(user.image) &&
        storage.delete(user.image.replace(`${R2_URL}/`, "")),
      unsubscribe({ email }),
      updateConfig({
        key: "emails",
        value: email,
      }),
    ]),
  );

  return NextResponse.json({ success: true });
});
