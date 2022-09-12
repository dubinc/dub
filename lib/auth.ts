import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import { unstable_getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/lib/prisma";

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

const withProjectAuth =
  (handler: NextApiHandler, isWriteEditLink?: boolean) =>
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

    const project = await prisma.project.findFirst({
      where: {
        slug,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!project) return res.status(401).end("Unauthorized");

    if (isWriteEditLink && !project.domainVerified) {
      return res
        .status(401)
        .end("Unauthorized: Cannot add links when domain is not verified");
    }

    return handler(req, res);
  };

export { withProjectAuth };
