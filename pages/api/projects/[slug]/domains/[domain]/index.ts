import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { addDomain, removeDomain, validateDomain } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import {
  changeDomainForImages,
  changeDomainForLinks,
  deleteRootDomainAndLinks,
  setRootDomain,
} from "@/lib/api/domains";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    const { slug, domain } = req.query as { slug: string; domain: string };

    if (
      !slug ||
      typeof slug !== "string" ||
      !domain ||
      typeof domain !== "string"
    ) {
      return res
        .status(400)
        .json({ error: "Missing or misconfigured project slug or domain" });
    }

    // PUT /api/projects/[slug]/domains/[domain] edit a project's domain
    if (req.method === "PUT") {
      const { slug: newDomain, target, type, primary } = req.body;

      if (project && project.slug !== slug) {
        return res.status(400).json({ error: "Invalid project slug" });
      }

      if (newDomain !== domain) {
        const validDomain = await validateDomain(newDomain);

        if (validDomain !== true) {
          return res.status(422).json({
            domainError: validDomain,
          });
        }
        const response = await Promise.allSettled([
          removeDomain(domain),
          addDomain(newDomain),
          setRootDomain(domain, target, type === "rewrite", newDomain),
          changeDomainForLinks(domain, newDomain),
          changeDomainForImages(domain, newDomain),
        ]);
        const updatedDomain = await prisma.domain.update({
          where: {
            slug: domain,
          },
          data: {
            slug: newDomain,
            target,
            type,
            primary,
          },
        });
        return res.status(200).json({
          ...response,
          updatedDomain,
        });
      } else {
        const response = await Promise.allSettled([
          prisma.domain.update({
            where: {
              slug: domain,
            },
            data: {
              target,
              type,
              primary,
            },
          }),
          setRootDomain(domain, target, type === "rewrite"),
        ]);
        return res.status(200).json(response);
      }
    } else if (req.method === "DELETE") {
      const response = await Promise.allSettled([
        removeDomain(domain),
        deleteRootDomainAndLinks(domain),
      ]);
      const deletedDomain = await prisma.domain.delete({
        where: {
          slug: domain,
        },
      });
      return res.status(200).json({
        ...response,
        deletedDomain,
      });
    } else {
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
