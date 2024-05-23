import { deleteWorkspaceAdmin } from "@/lib/api/workspaces";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { unsubscribe } from "@/lib/flodesk";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
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
      ...user.projects.map(({ project }) =>
        deleteWorkspaceAdmin({
          id: project.id,
          slug: project.slug,
          stripeId: project.stripeId || null,
          logo: project.logo || null,
        }),
      ),
      // delete user
      prisma.user.delete({
        where: {
          id: user.id,
        },
      }),
      // if the user has a custom avatar, delete it
      user.image?.startsWith(process.env.STORAGE_BASE_URL as string) &&
        storage.delete(`avatars/${user.id}`),
      unsubscribe(email),
      updateConfig({
        key: "emails",
        value: email,
      }),
    ]),
  );

  return NextResponse.json({ success: true });
});
