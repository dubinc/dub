import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { checkIfUserExists } from "@/lib/planetscale";
import { prisma } from "@dub/prisma";
import {
  WorkspaceSchema,
  createWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { FREE_WORKSPACES_LIMIT, nanoid } from "@dub/utils";
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
  });
  return NextResponse.json(
    workspaces.map((project) =>
      WorkspaceSchema.parse({ ...project, id: `ws_${project.id}` }),
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

  const freeWorkspaces = await prisma.project.count({
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

  try {
    const workspaceResponse = await prisma.project.create({
      data: {
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

    // if the user has no default workspace, set the new workspace as the default
    if (session.user["defaultWorkspace"] === null) {
      waitUntil(
        prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            defaultWorkspace: workspaceResponse.slug,
          },
        }),
      );
    }

    return NextResponse.json(
      WorkspaceSchema.parse({
        ...workspaceResponse,
        id: `ws_${workspaceResponse.id}`,
      }),
    );
  } catch (error) {
    if (error.code === "P2002") {
      throw new DubApiError({
        code: "conflict",
        message: `The slug "${slug}" is already in use.`,
      });
    } else {
      throw new DubApiError({
        code: "internal_server_error",
        message: error.message,
      });
    }
  }
});
