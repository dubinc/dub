import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { ProjectProps } from "@/lib/types";
import prisma from "@/lib/prisma";
import { addDomain, validateDomain } from "@/lib/api/domains";
import { redis } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    // GET /api/projects/[slug]/domains – get all domains for a project
    if (req.method === "GET") {
      const domains = await prisma.domain.findMany({
        where: {
          projectId: project.id,
        },
        select: {
          slug: true,
          verified: true,
          primary: true,
          target: true,
          type: true,
        },
      });
      return res.status(200).json(domains);

      // POST /api/projects/[slug]/domains - add a domain
    } else if (req.method === "POST") {
      const { slug: domain, primary, target, type } = req.body;

      const validDomain = await validateDomain(domain);
      if (validDomain !== true) {
        return res.status(422).json({
          domainError: validDomain,
        });
      }

      const response = await Promise.allSettled([
        await prisma.domain.create({
          data: {
            slug: domain,
            target,
            type,
            projectId: project.id,
            primary,
          },
        }),
        addDomain(domain),
        target &&
          redis.set(`root:${domain}`, {
            target,
            rewrite: type === "rewrite",
          }),
        primary &&
          (await prisma.domain.updateMany({
            where: {
              projectId: project.id,
              slug: {
                not: domain,
              },
            },
            data: {
              primary: false,
            },
          })),
      ]);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    excludeGet: true,
    needNotExceededUsage: true,
    needProSubscription: true,
  },
);
