import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { PlanProps, ProjectProps } from "./types";
import { getServerSession } from "next-auth/next";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
    image?: string;
  };
}

export async function getSession() {
  return getServerSession(authOptions) as Promise<Session>;
}

export function getSearchParams(url: string) {
  // Create a params object
  let params = {} as any;

  new URL(url).searchParams.forEach(function (val, key) {
    params[key] = val;
  });

  return params;
}

interface WithAuthHandler {
  ({
    req,
    params,
    searchParams,
    session,
    project,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    session: Session;
    project?: ProjectProps;
  }): Promise<Response>;
}
const withAuth =
  (
    handler: WithAuthHandler,
    {
      excludeGet, // if the action doesn't need to be gated for GET requests
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      requiredRole = ["owner", "member"],
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
    }: {
      excludeGet?: boolean;
      requiredPlan?: Array<PlanProps>;
      requiredRole?: Array<"owner" | "member">;
      needNotExceededUsage?: boolean;
    } = {},
  ) =>
  async (req: Request, { params }: { params: Record<string, string> }) => {
    const session = await getSession();
    if (!session?.user.id) {
      return new Response("Unauthorized: Login required.", { status: 401 });
    }

    const searchParams = getSearchParams(req.url);
    const { slug } = searchParams;

    // it's a project
    if (slug) {
      const project = (await prisma.project.findUnique({
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
          plan: true,
          stripeId: true,
          billingCycleStart: true,
          createdAt: true,
          users: {
            where: {
              userId: session.user.id,
            },
            select: {
              role: true,
            },
          },
        },
      })) as ProjectProps;

      if (project && project.users) {
        // project exists but user is not part of it
        if (project.users.length === 0) {
          const pendingInvites = await prisma.projectInvite.findUnique({
            where: {
              email_projectId: {
                email: session.user.email,
                projectId: project.id,
              },
            },
            select: {
              expires: true,
            },
          });
          if (!pendingInvites) {
            return new Response("Project not found.", {
              status: 404,
            });
          } else if (pendingInvites.expires < new Date()) {
            return new Response("Project invite expired.", {
              status: 410,
            });
          } else {
            return new Response("Project invite pending.", {
              status: 409,
            });
          }
        }
      } else {
        // project doesn't exist
        return new Response("Project not found.", {
          status: 404,
        });
      }

      // if the action doesn't need to be gated for GET requests, return handler now
      if (req.method === "GET" && excludeGet) {
        return handler({ req, params, searchParams, session, project });
      }

      if (
        project.plan === "enterprise" &&
        !requiredRole.includes(project.users[0].role) &&
        // removing self from project should be allowed (DELETE /api/projects/[slug]/users?userId=...)
        !(
          req.url === `/api/projects/${slug}/users?userId=${session.user.id}` &&
          req.method === "DELETE"
        )
      ) {
        return new Response("Unauthorized: Insufficient permissions.", {
          status: 403,
        });
      }

      if (needNotExceededUsage && project.usage > project.usageLimit) {
        return new Response("Unauthorized: Usage limits exceeded.", {
          status: 403,
        });
      }

      if (!requiredPlan.includes(project.plan)) {
        // return res.status(403).end("Unauthorized: Need higher plan.");
        return new Response("Unauthorized: Need higher plan.", {
          status: 403,
        });
      }

      return handler({ req, params, searchParams, session, project });
    }

    return handler({ req, params, searchParams, session });
  };

export { withAuth };
