import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { addDomain, removeDomain, validateDomain } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { changeDomainForImages, changeDomainForLinks } from "@/lib/api/links";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    // PUT /api/projects/[slug]/domains/[domain] edit a project's domain
    if (req.method === "PUT") {
      const { slug, domain } = req.query as { slug: string; domain: string };
      if (
        !slug ||
        typeof slug !== "string" ||
        !domain ||
        typeof domain !== "string" ||
        domain !== project.domain
      ) {
        return res
          .status(400)
          .json({ error: "Missing or misconfigured project slug or domain" });
      }

      const newDomain = req.body;

      const validDomain = await validateDomain(newDomain);

      if (validDomain !== true) {
        return res.status(422).json({
          domainError: validDomain,
        });
      }

      if (newDomain !== domain) {
        if (project && project.slug !== slug) {
          return res.status(400).json({ error: "Invalid project slug" });
        }
        const response = await Promise.allSettled([
          await prisma.domain.update({
            where: {
              slug: domain,
            },
            data: {
              slug: newDomain,
            },
          }),
          removeDomain(domain),
          addDomain(newDomain),
          changeDomainForLinks(project.id, domain, newDomain),
          changeDomainForImages(project.id, domain, newDomain),
        ]);
        return res.status(200).json(response);
      }

      return res.status(200).json({ message: "Domains are the same" });
    } else {
      res.setHeader("Allow", ["PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
