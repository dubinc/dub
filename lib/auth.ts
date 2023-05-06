import { NextApiRequest, NextApiResponse } from "next";
import { unstable_getServerSession } from "next-auth/next";
import prisma from "@/lib/prisma";
import { PlanProps, ProjectProps, UserProps } from "@/lib/types";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export interface Session {
  user: {
    email: string;
    id: string;
    name: string;
  };
}

export async function getServerSession(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // @ts-ignore
  return (await unstable_getServerSession(req, res, authOptions)) as Session;
}
interface WithProjectNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    project: ProjectProps,
    session: Session,
  ): Promise<void>;
}

const withProjectAuth =
  (
    handler: WithProjectNextApiHandler,
    {
      excludeGet, // if the action doesn't need to be gated for GET requests
      requiredPlan = ["free", "pro", "enterprise"], // if the action needs a specific plan
      needNotExceededUsage, // if the action needs the user to not have exceeded their usage
    }: {
      excludeGet?: boolean;
      requiredPlan?: Array<PlanProps>;
      needNotExceededUsage?: boolean;
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res);
    if (!session?.user.id) return res.status(401).end("Unauthorized");

    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

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

    if (project) {
      // project exists but user is not part of it
      if (project.users && project.users.length === 0) {
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
          return res.status(404).json({ error: "Project not found" });
        } else if (pendingInvites.expires < new Date()) {
          return res.status(410).json({ error: "Project invite expired" });
        } else {
          return res.status(409).json({ error: "Project invite pending" });
        }
      }
    } else {
      // project doesn't exist
      return res.status(404).json({ error: "Project not found" });
    }

    // if the action doesn't need to be gated for GET requests, return handler now
    if (req.method === "GET" && excludeGet)
      return handler(req, res, project, session);

    if (needNotExceededUsage && project.usage > project.usageLimit) {
      return res.status(403).end("Unauthorized: Usage limits exceeded.");
    }

    if (!requiredPlan.includes(project.plan)) {
      return res.status(403).end("Unauthorized: Need higher plan.");
    }

    return handler(req, res, project, session);
  };

export { withProjectAuth };

interface WithUsertNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    session: Session,
    user?: UserProps,
  ): Promise<void>;
}

const withUserAuth =
  (
    handler: WithUsertNextApiHandler,
    {
      needUserDetails, // if the action needs the user's details
    }: {
      needUserDetails?: boolean;
    } = {},
  ) =>
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getServerSession(req, res);
    if (!session?.user.id) return res.status(401).end("Unauthorized");

    if (req.method === "GET") return handler(req, res, session);

    if (needUserDetails) {
      const user = (await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      })) as UserProps;

      return handler(req, res, session, user);
    }

    return handler(req, res, session);
  };

export { withUserAuth };
