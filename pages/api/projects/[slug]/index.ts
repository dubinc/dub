import { withProjectAuth } from "@/lib/auth";
import { removeDomainFromVercel, deleteDomainLinks } from "@/lib/api/domains";
import prisma from "@/lib/prisma";

export default withProjectAuth(async (req, res, project) => {
  const { slug } = req.query;
  if (!slug || typeof slug !== "string") {
    return res
      .status(400)
      .json({ error: "Missing or misconfigured project slug" });
  }
  // GET /api/projects/[slug] – get a specific project
  if (req.method === "GET") {
    return res.status(200).json(project);

    // PUT /api/projects/[slug] – edit a specific project
  } else if (req.method === "PUT") {
    const { name, newSlug } = req.body;
    try {
      const response = await prisma.project.update({
        where: {
          slug,
        },
        data: {
          ...(name && { name }),
          ...(newSlug && { slug: newSlug }),
        },
      });
      return res.status(200).json(response);
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(422).json({ error: "Key already exists" });
      }
    }
    // DELETE /api/projects/[slug] – delete a project
  } else if (req.method === "DELETE") {
    const domains = (
      await prisma.domain.findMany({
        where: {
          projectId: project.id,
        },
        select: {
          slug: true,
        },
      })
    ).map((domain) => domain.slug);

    const response = await Promise.allSettled([
      prisma.project.delete({
        where: {
          slug,
        },
      }),
      ...domains.map((domain) => removeDomainFromVercel(domain)),
      ...domains.map((domain) => deleteDomainLinks(domain)),
    ]);

    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
