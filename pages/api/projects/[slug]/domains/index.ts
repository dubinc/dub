import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";
import {
  addDomainToVercel,
  setRootDomain,
  validateDomain,
} from "#/lib/api/domains";
import { redis } from "#/lib/upstash";
import { isIframeable } from "#/lib/middleware/utils";

export default withProjectAuth(async (req, res, project) => {
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
    const validDomain = await validateDomain(domain, project.id);
    if (validDomain !== true) {
      return res.status(422).json({
        domainError: validDomain,
      });
    }
    const vercelResponse = await addDomainToVercel(domain);
    if (vercelResponse.error) {
      return res.status(422).json({
        domainError: vercelResponse.error.message,
      });
    }
    /* 
        If the domain is being added, we need to:
          1. Add the domain to Vercel
          2. If there's a landing page set, update the root domain in Redis
          3. If the domain is being set as the primary domain, set all other domains to not be the primary domain
          4. Add the domain to the database along with its primary status
      */
    const response = await Promise.allSettled([
      target &&
        setRootDomain({
          domain,
          target,
          rewrite: type === "rewrite",
        }),
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
      prisma.domain.create({
        data: {
          slug: domain,
          target,
          type,
          projectId: project.id,
          primary,
        },
      }),
    ]);
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
