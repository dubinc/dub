import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { addDomain, removeDomain, validateDomain } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import {
  changeDomainForImages,
  changeDomainForLinks,
  deleteDomainLinks,
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

      /* 
        If the domain is being changed (and the new domain is valid), we need to:
          1. Remove the old domain from Vercel
          2. Add the new domain to Vercel
          3. If there's a landing page set, update the root domain in Redis
          4. Update all links in the project to point to the new domain
          5. Update all images in the project to point to the new domain
          6. If the domain is being set as the primary domain, set all other domains to not be the primary domain
          7. Update the domain in the database along with its primary status
      */
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
          target &&
            setRootDomain(domain, target, type === "rewrite", newDomain),
          changeDomainForLinks(domain, newDomain),
          changeDomainForImages(domain, newDomain),
          primary &&
            prisma.domain.updateMany({
              where: {
                projectId: project.id,
                primary: true,
              },
              data: {
                primary: false,
              },
            }),
          prisma.domain.update({
            where: {
              slug: domain,
            },
            data: {
              slug: newDomain,
              target,
              type,
              primary,
            },
          }),
        ]);
        return res.status(200).json(response);
      } else {
        /* 
          If the domain is not being changed, we only need to:
            1. If there's a landing page set, update the root domain in Redis
            2. If the domain is being set as the primary domain, set all other domains to not be the primary domain
            3. Then, update the domain in the database along with its primary status
        */
        const response = await Promise.allSettled([
          target && setRootDomain(domain, target, type === "rewrite"),
          primary &&
            prisma.domain.updateMany({
              where: {
                projectId: project.id,
                primary: true,
              },
              data: {
                primary: false,
              },
            }),
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
        ]);
        return res.status(200).json(response);
      }
    } else if (req.method === "DELETE") {
      const response = await Promise.allSettled([
        removeDomain(domain),
        deleteDomainLinks(domain),
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
