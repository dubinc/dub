import { deleteWorkspaceAdmin } from "@/lib/api/workspaces/delete-workspace";
import { withAdmin } from "@/lib/auth";
import { updateConfig } from "@/lib/edge-config";
import { extractEmailDomain } from "@/lib/email/extract-email-domain";
import { prisma } from "@/lib/prisma";
import { isStored, storage } from "@/lib/storage";
import { R2_URL } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/admin/ban
export const POST = withAdmin(
  async ({ req }) => {
    const { email, blockEmailDomain } = await req.json();

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

    const emailDomain = extractEmailDomain(email);

    // block email in edge config first so that no feedback emails are sent
    await Promise.all([
      updateConfig({
        key: "emails",
        value: email,
      }),
      blockEmailDomain &&
        emailDomain &&
        updateConfig({
          key: "emailDomainTerms",
          value: emailDomain,
        }),
    ]);

    console.log(
      `Found user ${user.email} with ${user.projects.length} workspaces`,
    );

    waitUntil(
      Promise.allSettled(
        user.projects.map(({ project }) => deleteWorkspaceAdmin(project)),
      ).then(async () => {
        // delete user after all workspaces are deleted
        await prisma.user.delete({
          where: {
            id: user.id,
          },
        });
        console.log(`Deleted user ${user.email}`);

        if (user.image && isStored(user.image)) {
          await storage.delete({ key: user.image.replace(`${R2_URL}/`, "") });
          console.log(`Deleted user image ${user.image}`);
        }
      }),
    );

    return NextResponse.json({ success: true });
  },
  {
    requiredRoles: ["owner"],
  },
);
