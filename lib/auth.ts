import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";
import { getUsage } from "./upstash";

interface Session {
  user: {
    email?: string | null;
    id?: string | null;
    name?: string | null;
  };
}

export async function getSession(req: NextApiRequest, res: NextApiResponse) {
  const session = (await unstable_getServerSession(
    req,
    res,
    authOptions
  )) as Session | null;
  return session;
}

import { ProjectProps } from "@/lib/types";

interface CustomNextApiHandler {
  (
    req: NextApiRequest,
    res: NextApiResponse,
    project: ProjectProps
  ): Promise<void>;
}

const withProjectAuth =
  (handler: CustomNextApiHandler, isWriteEditLink?: boolean) =>
  // TODO - fix `handler` type when we figure it out
  // `isWriteEditLink` is only true when it's a POST or PUT request for links
  // (you can't add/edit a link when domain is not configured)
  async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    if (!session?.user.id) return res.status(401).end("Unauthorized");

    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

    const project = (await prisma.project.findFirst({
      where: {
        slug,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
      select: {
        name: true,
        slug: true,
        domain: true,
        domainVerified: true,
        plan: true,
        usageLimit: true,
        stripeId: true,
        lastBilled: true,
      },
    })) as ProjectProps;

    if (!project) return res.status(404).json({ error: "Project not found" });

    if (isWriteEditLink && req.method !== "GET") {
      if (!project.domainVerified) {
        return res
          .status(401)
          .end(
            "Unauthorized: Cannot add or edit links when domain is not verified."
          );
      } else {
        const usage = await getUsage(project.domain);
        if (usage > project.usageLimit) {
          return res
            .status(403)
            .end(
              "Unauthorized: Cannot add or edit links when usage limits are exceeded."
            );
        }
      }
    }

    return handler(req, res, project);
  };

export { withProjectAuth };
