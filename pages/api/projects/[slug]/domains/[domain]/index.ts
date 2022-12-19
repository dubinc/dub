import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { addDomain, removeDomain } from "@/lib/domains";
import prisma from "@/lib/prisma";
import { validDomainRegex } from "@/lib/utils";
import { changeDomainForImages, changeDomainForLinks } from "@/lib/api/links";
import { ProjectProps } from "@/lib/types";
import cloudinary from "cloudinary";

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

      const validDomain =
        validDomainRegex.test(newDomain) && !newDomain.endsWith(".dub.sh");

      if (!validDomain) {
        return res.status(422).json({
          domainError: "Invalid domain",
        });
      }

      if (domain !== newDomain) {
        if (project && project.slug !== slug) {
          return res.status(400).json({ error: "Domain already exists" });
        }
        const [removeResponse, addResponse, upstashResponse, prismaResponse] =
          await Promise.allSettled([
            removeDomain(domain),
            addDomain(newDomain),
            prisma.project.update({
              where: {
                slug,
              },
              data: {
                domain: newDomain,
                domainVerified: false,
              },
            }),
            changeDomainForLinks(project.id, domain, newDomain),
            changeDomainForImages(project.id, domain, newDomain),
          ]);

        return res.status(200).json({
          removeResponse,
          addResponse,
          upstashResponse,
          prismaResponse,
        });
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
