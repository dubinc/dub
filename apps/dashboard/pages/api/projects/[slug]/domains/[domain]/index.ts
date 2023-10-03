import { withProjectAuth } from "#/lib/auth";
import {
  addDomainToVercel,
  removeDomainFromVercel,
  validateDomain,
} from "#/lib/api/domains";
import prisma from "#/lib/prisma";
import {
  changeDomainForImages,
  changeDomainForLinks,
  deleteDomainAndLinks,
  setRootDomain,
} from "#/lib/api/domains";
import { redis } from "#/lib/upstash";

export default withProjectAuth(
  async (req, res, project) => {
    const { slug, domain } = req.query as { slug: string; domain: string };

    if (
      !slug ||
      typeof slug !== "string" ||
      !domain ||
      typeof domain !== "string"
    ) {
      return res
        .status(400)
        .end("Missing or misconfigured project slug or domain");
    }

    // prevent unauthorized access to domains that don't belong to the project
    const domainBelongsToProject = await prisma.domain.findFirst({
      where: {
        slug: domain,
        projectId: project.id,
      },
    });
    if (!domainBelongsToProject) {
      return res.status(404).end("Domain not found");
    }

    // PUT /api/projects/[slug]/domains/[domain] edit a project's domain
    if (req.method === "PUT") {
      const { slug: newDomain, target, type, primary } = req.body;

      const validDomain = await validateDomain(newDomain, project.id);
      if (validDomain !== true) {
        return res.status(422).json({
          domainError: validDomain,
        });
      }

      if (newDomain !== domain) {
        const vercelResponse = await addDomainToVercel(newDomain);
        if (vercelResponse.error) {
          return res.status(422).json({
            domainError: vercelResponse.error.message,
          });
        }
      }

      const response = await Promise.allSettled([
        // if the domain is being changed, we need to:
        //  1. Remove the old domain from Vercel
        //  2. Add the new domain to Vercel
        //  3. Update all links in the project to point to the new domain
        //  4. Update all images in the project to point to the new domain
        ...(newDomain !== domain
          ? [
              removeDomainFromVercel(domain),
              changeDomainForLinks(domain, newDomain),
              changeDomainForImages(domain, newDomain),
            ]
          : []),
        /* 
        if the project is not a free plan:
          - if the domain is being set: 
            - Set the root domain to the target in Redis
            - if the domain is being changed, also change the root domain key in Redis
          - if the domain is being unset:
            - delete the root domain key in Redis
      */
        project.plan !== "free" &&
          (target
            ? setRootDomain({
                domain,
                target,
                rewrite: type === "rewrite",
                ...(newDomain !== domain && {
                  newDomain,
                }),
              })
            : redis.del(`root:${domain}`)),
        // if the domain is being set as the primary domain, set the current primary domain to false
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
        // Update the domain in the database along with its primary status
        prisma.domain.update({
          where: {
            slug: domain,
          },
          data: {
            ...(newDomain !== domain && {
              slug: newDomain,
            }),
            // same logic as the redis part above
            ...(project.plan !== "free" &&
              (target
                ? {
                    target,
                  }
                : {
                    target: null,
                  })),
            type,
            primary,
          },
        }),
      ]);

      return res.status(200).json(response);

      // DELETE /api/projects/[slug]/domains/[domain] delete a project's domain
    } else if (req.method === "DELETE") {
      const response = await deleteDomainAndLinks(domain);
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["PUT", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredRole: ["owner"],
  },
);
