import { deleteProjectAdmin } from "@/lib/api/projects";
import { withAdmin } from "@/lib/auth/utils";
import { unsubscribe } from "@/lib/flodesk";
import prisma from "@/lib/prisma";
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
      deleteProjectAdmin({
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
    // cloudinary.v2.uploader.destroy(`avatars/${user.id}`, {
    //   invalidate: true,
    // }),
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
