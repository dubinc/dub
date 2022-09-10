import { NextApiRequest, NextApiResponse } from "next";
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
  // TODO - fix this type when we figure it out
  (handler: any) => async (req: NextApiRequest, res: NextApiResponse) => {
    const session = await getSession(req, res);
    if (!session?.user.id) return res.status(401).end("Unauthorized");

    const { slug } = req.query;
    if (!slug || typeof slug !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug" });
    }

    const isProjectOwner = await prisma.project.count({
      where: {
        slug,
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });

    if (!isProjectOwner) return res.status(401).end("Unauthorized");

    return handler(req, res);
  };

export { withProjectAuth };
