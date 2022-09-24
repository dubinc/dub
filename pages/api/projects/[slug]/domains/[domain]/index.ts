import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withProjectAuth } from "@/lib/auth";
import { changeDomain } from "@/lib/upstash";
import { validDomainRegex } from "@/lib/utils";
import { addDomain, removeDomain } from "@/lib/domains";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      const { slug, domain } = req.query as { slug: string; domain: string }; // slug is the domain
      const newDomain = req.body;

      const validDomain =
        validDomainRegex.test(newDomain) && !newDomain.endsWith(".dub.sh");

      if (!validDomain) {
        return res.status(422).json({
          domainError: "Invalid domain",
        });
      }

      if (domain !== newDomain) {
        // make sure domain doesn't exist
        const project = await prisma.project.findUnique({
          where: {
            domain: newDomain,
          },
          select: { slug: true },
        });
        if (project && project.slug !== slug) {
          return res.status(400).json({ error: "Domain already exists" });
        }
        const [removeResponse, addResponse, upstashResponse, prismaResponse] =
          await Promise.all([
            removeDomain(domain),
            addDomain(newDomain),
            changeDomain(domain, newDomain),
            prisma.project.update({
              where: {
                slug,
              },
              data: {
                domain: newDomain,
                domainVerified: false,
              },
            }),
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
  }
);
