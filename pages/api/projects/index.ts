import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { validDomainRegex } from "@/lib/utils";
import { addDomain, removeDomain } from "@/lib/domains";
import { RESERVED_KEYS, DEFAULT_REDIRECTS } from "@/lib/constants";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

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
      return res.status(422).json({ error: "Missing name or slug or domain" });
    }
    let slugError = null;
    if (slug.includes(" ") || slug.includes(".")) {
      slugError = "Slug cannot contain spaces or periods";
    } else if (RESERVED_KEYS.has(slug) || DEFAULT_REDIRECTS[slug]) {
      slugError = "Cannot use reserved slugs";
    }
    const validDomain =
      validDomainRegex.test(domain) && !domain.endsWith(".dub.sh");
    if (slugError || !validDomain) {
      return res.status(422).json({
        slugError,
        domainError: validDomain ? null : "Invalid domain",
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
      prisma.project.findUnique({
        where: {
          domain,
        },
        select: {
          domain: true,
        },
      }),
    ]);
    if (slugExist || domainExist) {
      return res.status(422).json({
        slugError: slugExist ? "Slug is already in use." : null,
        domainError: domainExist ? "Domain is already in use." : null,
      });
    }

    const [prismaResponse, domainResponse] = await Promise.all([
      prisma.project.create({
        data: {
          name,
          slug,
          domain,
          users: {
            create: {
              userId: session.user.id,
              role: "owner",
            },
          },
        },
      }),
      addDomain(domain),
    ]);
    return res
      .status(200)
      .json({ project: prismaResponse, domain: domainResponse });
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
