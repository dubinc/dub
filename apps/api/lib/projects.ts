import { Context } from "hono";

import { prisma } from "@dub/database";
import { DubApiError } from "./errors";
import { HonoEnv } from "./hono";

// Checks if the user is authorized to access the project
export const authorizeAndRetrieveProject = async (c: Context<HonoEnv>) => {
  const slug = c.req.param("projectSlug") || c.req.query("projectSlug");
  const user = c.get("user");

  const requiredPlan = ["free", "pro", "business", "enterprise"]; // if the action needs a specific plan
  const requiredRole = ["owner", "member"];

  const project = await prisma.project.findUnique({
    where: {
      slug,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      usage: true,
      usageLimit: true,
      linksUsage: true,
      linksLimit: true,
      domainsLimit: true,
      tagsLimit: true,
      usersLimit: true,
      plan: true,
      stripeId: true,
      billingCycleStart: true,
      createdAt: true,
      metadata: true,
      users: {
        where: {
          userId: user.id,
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

  // project doesn't exist
  if (!project || !project.users) {
    throw new DubApiError({
      code: "not_found",
      message: "Project not found.",
    });
  }

  // project exists but user is not part of it
  if (project.users.length === 0) {
    const pendingInvites = await prisma.projectInvite.findUnique({
      where: {
        email_projectId: {
          email: user.email!,
          projectId: project.id,
        },
      },
      select: {
        expires: true,
      },
    });

    if (!pendingInvites) {
      throw new DubApiError({
        code: "not_found",
        message: "Project not found.",
      });
    } else if (pendingInvites.expires < new Date()) {
      throw new DubApiError({
        code: "invite_expired",
        message: "Project invite expired.",
      });
    } else {
      throw new DubApiError({
        code: "invite_pending",
        message: "Project invite pending.",
      });
    }
  }

  // project role checks (enterprise only)
  if (
    requiredRole &&
    project.plan === "enterprise" &&
    !requiredRole.includes(project.users[0].role)
  ) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Insufficient permissions.",
    });
  }

  // clicks usage overage checks
  // if (needNotExceededClicks && project.usage > project.usageLimit) {
  //   return new Response(
  //     exceededLimitError({
  //       plan: project.plan,
  //       limit: project.usageLimit,
  //       type: "clicks",
  //     }),
  //     {
  //       status: 403,
  //       headers,
  //     },
  //   );
  // }

  // links usage overage checks
  // if (needNotExceededLinks && project.linksUsage > project.linksLimit) {
  //   return new Response(
  //     exceededLimitError({
  //       plan: project.plan,
  //       limit: project.linksLimit,
  //       type: "links",
  //     }),
  //     {
  //       status: 403,
  //       headers,
  //     },
  //   );
  // }

  // plan checks
  if (!requiredPlan.includes(project.plan)) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized: Need higher plan.",
    });
  }

  return {
    project,
  };
};
