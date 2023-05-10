import { withProjectAuth } from "@/lib/auth";
import {
  addDomainToVercel,
  removeDomainFromVercel,
  validateDomain,
} from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import {
  changeDomainForImages,
  changeDomainForLinks,
  deleteDomainLinks,
  setRootDomain,
} from "@/lib/api/domains";

export default withProjectAuth(async (req, res, project) => {
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

  // prevent unauthorized access to domains that don't belong to the project
  const domainBelongsToProject = await prisma.domain.findFirst({
    where: {
      slug: domain,
      projectId: project.id,
    },
  });
  if (!domainBelongsToProject) {
    return res.status(404).json({ error: "Domain not found" });
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

    const response = await Promise.allSettled([
      // if the domain is being changed, we need to:
      //  1. Remove the old domain from Vercel
      //  2. Add the new domain to Vercel
      //  3. Update all links in the project to point to the new domain
      //  4. Update all images in the project to point to the new domain
      ...(newDomain !== domain
        ? [
            removeDomainFromVercel(domain).then(() =>
              addDomainToVercel(newDomain),
            ),
            changeDomainForLinks(domain, newDomain),
            changeDomainForImages(domain, newDomain),
          ]
        : []),
      // if there's a landing page set, and if the project is not a free plan, we can then:
      // - Set the root domain to the target in Redis
      // - if the domain is being changed, also change the root domain key in Redis
      target &&
        project.plan !== "free" &&
        setRootDomain(
          domain,
          target,
          type === "rewrite",
          newDomain !== domain && newDomain,
        ),
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
          ...(target &&
            project.plan !== "free" && {
              target,
            }),
          type,
          primary,
        },
      }),
    ]);

    return res.status(200).json(response);

    // DELETE /api/projects/[slug]/domains/[domain] delete a project's domain
  } else if (req.method === "DELETE") {
    const response = await Promise.allSettled([
      removeDomainFromVercel(domain),
      deleteDomainLinks(domain),
      prisma.domain.delete({
        where: {
          slug: domain,
        },
      }),
    ]);
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["PUT", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
