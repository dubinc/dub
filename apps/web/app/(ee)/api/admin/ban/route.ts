import { deleteWorkspaceAdmin } from "@/lib/api/workspaces";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { isStored, storage } from "@/lib/storage";
import { unsubscribe } from "@dub/email/resend/unsubscribe";
import { prisma } from "@dub/prisma";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/admin/ban
export const POST = withAdmin(async ({ req }) => {
  const { email } = await req.json();

  const user = await prisma.user.findUniqueOrThrow({
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

  console.log(
    `Found user ${user.email} with ${user.projects.length} workspaces`,
  );

  waitUntil(
    Promise.allSettled(
      user.projects.map(({ project }) => deleteWorkspaceAdmin(project)),
    ).then(async () => {
      await Promise.allSettled([
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
      ]);
    }),
  );

  return NextResponse.json({ success: true });
});
