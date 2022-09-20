import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { domainRegex } from "@/lib/utils";
import { addDomain, removeDomain } from "@/lib/domains";

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
    const slugError =
      slug.includes(" ") || slug.includes(".")
        ? "Slug cannot contain spaces or periods"
        : null;
    const validDomain = domainRegex.test(domain);
    if (slugError || !validDomain) {
      return res.status(422).json({
        slugError,
        domainError: validDomain ? null : "Invalid domain",
      });
    }
    // try to add domain first, if it fails to add return an error
    const domainResponse = await addDomain(domain);
    if (!domainResponse.error) {
      try {
        const project = await prisma.project.create({
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
        });
        return res.status(200).json({ project, domain: domainResponse });
      } catch (error: any) {
        if (error.code === "P2002") {
          await removeDomain(domain);
          return res.status(400).json({ error: "Project slug already exists" });
        }
      }
    } else {
      return res
        .status(422)
        .json({ domainError: domainResponse.error.message });
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
