import prisma from "@/lib/prisma";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { Link as LinkProps } from "@prisma/client";
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
    link,
  }: {
    req: Request;
    params: Record<string, string>;
    searchParams: Record<string, string>;
    session: Session;
    project?: ProjectProps;
    link?: LinkProps;
  }): Promise<Response>;
}
const withAuth =
  (
    handler: WithAuthHandler,
    {
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      requiredRole = ["owner", "member"],
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
    }: {
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
    const { slug, domain, key } = searchParams;

    const [project, link] = (await Promise.all([
      slug &&
        (await prisma.project.findUnique({
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
            domains: true,
            users: {
              where: {
                userId: session.user.id,
              },
              select: {
                role: true,
              },
            },
          },
        })),
      domain &&
        key &&
        prisma.link.findUnique({
          where: {
            domain_key: {
              domain,
              key,
            },
          },
        }),
    ])) as [ProjectProps | undefined, LinkProps | undefined];

    // it's a project
    if (slug) {
      if (!project || !project.users) {
        // project doesn't exist
        return new Response("Project not found.", {
          status: 404,
        });
      }

      if (domain && !project.domains!.find((d) => d.slug === domain)) {
        return new Response("Unauthorized: Invalid domain.", {
          status: 401,
        });
      }

      if (link && link.projectId !== project.id) {
        return new Response("Unauthorized: Invalid link.", {
          status: 401,
        });
      }

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
    } else if (link) {
      // no slug means it's a generic Dub.sh link
      // thus, we need to make sure the user is the owner of the link
      if (link.userId !== session.user.id) {
        return new Response("Unauthorized: Invalid link.", {
          status: 401,
        });
      }
    }

    return handler({ req, params, searchParams, session, project, link });
  };

export { withAuth };
