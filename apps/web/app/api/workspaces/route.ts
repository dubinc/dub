import { DubApiError } from "@/lib/api/errors";
import { generateRandomString } from "@/lib/api/utils/generate-random-string";
import { createWorkspaceId } from "@/lib/api/workspaces/create-workspace-id";
import { prefixWorkspaceId } from "@/lib/api/workspaces/workspace-id";
import { withSession } from "@/lib/auth";
import { checkIfUserExists } from "@/lib/planetscale";
import { storage } from "@/lib/storage";
import {
  createWorkspaceSchema,
  WorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { FREE_WORKSPACES_LIMIT, nanoid, R2_URL } from "@dub/utils";
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
  const { name, slug, logo } = await createWorkspaceSchema.parseAsync(
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
    let uploadedImageUrl: string | undefined;

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

        const workspaceId = createWorkspaceId();
        uploadedImageUrl = logo
          ? `${R2_URL}/workspaces/${workspaceId}/logo_${nanoid(7)}`
          : undefined;

        return await tx.project.create({
          data: {
            id: workspaceId,
            name,
            slug,
            logo: uploadedImageUrl,
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

        // Upload logo to R2 if uploaded
        logo &&
          uploadedImageUrl &&
          storage.upload({
            key: uploadedImageUrl.replace(`${R2_URL}/`, ""),
            body: logo,
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
