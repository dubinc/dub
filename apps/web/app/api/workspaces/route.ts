import { addDomainToVercel, validateDomain } from "@/lib/api/domains";
import { createDomain } from "@/lib/api/domains/create-domain";
import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { checkIfUserExists } from "@/lib/planetscale";
import { prisma } from "@/lib/prisma";
import { WorkspaceProps } from "@/lib/types";
import { createDomainBodySchema } from "@/lib/zod/schemas/domains";
import {
  WorkspaceSchema,
  createWorkspaceSchema,
} from "@/lib/zod/schemas/workspaces";
import { FREE_WORKSPACES_LIMIT, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// GET /api/workspaces - get all projects for the current user
export const GET = withSession(async ({ session }) => {
  const projects = await prisma.project.findMany({
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
        },
      },
    },
  });
  return NextResponse.json(
    projects.map((project) =>
      WorkspaceSchema.parse({ ...project, id: `ws_${project.id}` }),
    ),
  );
});

export const POST = withSession(async ({ req, session }) => {
  const { name, slug, domain } = await createWorkspaceSchema.parseAsync(
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

  const [slugExist, validDomain] = await Promise.all([
    prisma.project.findUnique({
      where: {
        slug,
      },
      select: {
        slug: true,
      },
    }),
    domain ? validateDomain(domain) : { error: null },
  ]);

  if (slugExist) {
    throw new DubApiError({
      code: "conflict",
      message: "Slug is already in use.",
    });
  }

  if (validDomain.error && validDomain.code) {
    throw new DubApiError({
      code: validDomain.code,
      message: validDomain.error,
    });
  }

  const projectResponse = await prisma.project.create({
    data: {
      name,
      slug,
      users: {
        create: {
          userId: session.user.id,
          role: "owner",
        },
      },
      billingCycleStart: new Date().getDate(),
      inviteCode: nanoid(24),
      defaultDomains: {
        create: {}, // by default, we give users all the default domains when they create a project
      },
    },
    include: {
      domains: {
        select: {
          id: true,
          slug: true,
          primary: true,
        },
      },
      users: {
        select: {
          role: true,
        },
      },
    },
  });

  waitUntil(
    (async () => {
      if (session.user["defaultWorkspace"] === null) {
        await prisma.user.update({
          where: {
            id: session.user.id,
          },
          data: {
            defaultWorkspace: projectResponse.slug,
          },
        });
      }
      if (domain) {
        const domainRepsonse = await addDomainToVercel(domain);
        if (domainRepsonse.error) {
          await prisma.domain.delete({
            where: {
              slug: domain,
              projectId: projectResponse.id,
            },
          });
        } else {
          await createDomain({
            ...createDomainBodySchema.parse({ slug: domain }),
            workspace: projectResponse as WorkspaceProps,
            userId: session.user.id,
          });
        }
      }
    })(),
  );

  const response = {
    ...projectResponse,
    id: `ws_${projectResponse.id}`,
    domains: projectResponse.domains.map(({ slug, primary }) => ({
      slug,
      primary,
    })),
  };

  return NextResponse.json(response);
});
