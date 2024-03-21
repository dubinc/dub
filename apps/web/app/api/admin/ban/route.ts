import { deleteWorkspaceAdmin } from "@/lib/api/workspaces";
import { withAdmin } from "@/lib/auth";
import { unsubscribe } from "@/lib/flodesk";
import prisma from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { get } from "@vercel/edge-config";
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

  const blacklistedEmails = (await get("emails")) as string[];

  await Promise.allSettled(
    user.projects.map(({ project }) =>
      deleteWorkspaceAdmin({
        id: project.id,
        slug: project.slug,
        stripeId: project.stripeId || null,
        logo: project.logo || null,
      }),
    ),
  );

  await Promise.allSettled([
    prisma.user.delete({
      where: {
        id: user.id,
      },
    }),
    // if the user has a custom avatar, delete it
    user.image?.startsWith(process.env.STORAGE_BASE_URL as string) &&
      storage.delete(`avatars/${user.id}`),
    unsubscribe(user.email),
    fetch(
      `https://api.vercel.com/v1/edge-config/${process.env.EDGE_CONFIG_ID}/items?teamId=${process.env.TEAM_ID_VERCEL}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              operation: "update",
              key: "emails",
              value: [...blacklistedEmails, email],
            },
          ],
        }),
      },
    ),
  ]);

  return NextResponse.json({ success: true });
});
