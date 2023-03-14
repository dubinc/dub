import { NextApiRequest, NextApiResponse } from "next";
import { Session, withUserAuth } from "@/lib/auth";
import { DEFAULT_REDIRECTS } from "@/lib/constants";
import { addDomain, validateDomain } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { isReservedKey } from "@/lib/utils";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse, session: Session) => {
    // GET /api/projects – get all projects associated with the authenticated user
    if (req.method === "GET") {
      const response = await prisma.project.findMany({
        where: {
          users: {
            some: {
              userId: session.user.id,
            },
          },
        },
      });
      return res.status(200).json(response);

      // POST /api/projects – create a new project
    } else if (req.method === "POST") {
      const { name, slug, domain } = req.body;
      if (!name || !slug || !domain) {
        return res
          .status(422)
          .json({ error: "Missing name or slug or domain" });
      }
      let slugError = null;
      if (slug.includes(" ") || slug.includes(".")) {
        slugError = "Slug cannot contain spaces or periods";
      } else if ((await isReservedKey(slug)) || DEFAULT_REDIRECTS[slug]) {
        slugError = "Cannot use reserved slugs";
      }
      const validDomain = await validateDomain(domain);
      if (slugError || !validDomain) {
        return res.status(422).json({
          slugError,
          domainError: validDomain || "Invalid domain",
        });
      }
      const [slugExist, domainExist] = await Promise.all([
        prisma.project.findUnique({
          where: {
            slug,
          },
          select: {
            slug: true,
          },
        }),
        prisma.domain.findUnique({
          where: {
            slug: domain,
          },
          select: {
            slug: true,
          },
        }),
      ]);
      if (slugExist || domainExist) {
        return res.status(422).json({
          slugError: slugExist ? "Slug is already in use." : null,
          domainError: domainExist ? "Domain is already in use." : null,
        });
      }

      const { usageLimit: ownerUsageLimit } = await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          usageLimit: true,
        },
      });

      const project = await prisma.project.create({
        data: {
          name,
          slug,
          domain,
          ownerUsageLimit,
          users: {
            create: {
              userId: session.user.id,
              role: "owner",
            },
          },
        },
      });
      const response = await Promise.allSettled([
        prisma.domain.create({
          data: {
            slug: domain,
            projectId: project.id,
            primary: true,
          },
        }),
        addDomain(domain),
      ]);

      return res.status(200).json({ project, ...response });
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    needProSubscription: true,
  },
);
