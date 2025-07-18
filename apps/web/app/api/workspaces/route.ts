import { DubApiError } from "@/lib/api/errors";
import { createWorkspaceId, prefixWorkspaceId } from "@/lib/api/workspace-id";
import { withSession } from "@/lib/auth";
import { checkIfUserExists } from "@/lib/planetscale";
import {
  WorkspaceSchema,
  createWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { subscribe } from "@dub/email/resend/subscribe";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import {
  FREE_WORKSPACES_LIMIT,
  generateRandomString,
  nanoid,
} from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/workspaces - get all projects for the current user
export const GET = withSession(async ({ session }) => {
  const workspaces = await prisma.project.findMany({
    where: {
      users: {
        some: {
          userId: session.user.id,
        },
      },
    },
    include: {
      users: {
        where: {
          userId: session.user.id,
        },
        select: {
          role: true,
          defaultFolderId: true,
        },
      },
      domains: {
        select: {
          slug: true,
          primary: true,
          verified: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  return NextResponse.json(
    workspaces.map((project) =>
      WorkspaceSchema.parse({
        ...project,
        id: prefixWorkspaceId(project.id),
      }),
    ),
  );
});

export const POST = withSession(async ({ req, session }) => {
  const { name, slug } = await createWorkspaceSchema.parseAsync(
    await req.json(),
  );

  const userExists = await checkIfUserExists(session.user.id);

  if (!userExists) {
    throw new DubApiError({
      code: "not_found",
      message: "Session expired. Please log in again.",
    });
  }

  try {
    const workspace = await prisma.$transaction(
      async (tx) => {
        const freeWorkspaces = await tx.project.count({
          where: {
            plan: "free",
            users: {
              some: {
                userId: session.user.id,
                role: "owner",
              },
            },
          },
        });

        if (freeWorkspaces >= FREE_WORKSPACES_LIMIT) {
          throw new DubApiError({
            code: "exceeded_limit",
            message: `You can only create up to ${FREE_WORKSPACES_LIMIT} free workspaces. Additional workspaces require a paid plan.`,
          });
        }

        return await tx.project.create({
          data: {
            id: createWorkspaceId(),
            name,
            slug,
            users: {
              create: {
                userId: session.user.id,
                role: "owner",
                notificationPreference: {
                  create: {},
                },
              },
            },
            billingCycleStart: new Date().getDate(),
            invoicePrefix: generateRandomString(8),
            inviteCode: nanoid(24),
            defaultDomains: {
              create: {}, // by default, we give users all the default domains when they create a project
            },
          },
          include: {
            users: {
              where: {
                userId: session.user.id,
              },
              select: {
                role: true,
                defaultFolderId: true,
              },
            },
            domains: {
              select: {
                slug: true,
                primary: true,
              },
            },
          },
        });
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 5000,
      },
    );

    waitUntil(
      Promise.allSettled([
        // if the user has no default workspace, set the new workspace as the default
        session.user["defaultWorkspace"] === null &&
          prisma.user.update({
            where: {
              id: session.user.id,
            },
            data: {
              defaultWorkspace: workspace.slug,
            },
          }),
        // Subscribe the user to the app.dub.co Resend audience
        subscribe({
          email: session.user.email,
          name: session.user.name || undefined,
          audience: "app.dub.co",
        }),
      ]),
    );

    return NextResponse.json(
      WorkspaceSchema.parse({
        ...workspace,
        id: prefixWorkspaceId(workspace.id),
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new DubApiError({
        code: "conflict",
        message: `The slug "${slug}" is already in use.`,
      });
    }

    if (error instanceof DubApiError) {
      throw error;
    }

    throw new DubApiError({
      code: "internal_server_error",
      message: "Error creating workspace. Please try again later.",
    });
  }
});
