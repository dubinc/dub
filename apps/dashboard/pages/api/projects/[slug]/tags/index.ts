import { randomBadgeColor } from "@/components/app/links/tag-badge";
import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withProjectAuth(async (req, res, project) => {
  // GET /api/projects/[slug]/tags - get all tags for a project
  if (req.method === "GET") {
    const tags = await prisma.tag.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        name: "asc",
      },
    });
    return res.status(200).json(tags);
  } else if (req.method === "POST") {
    const tagsCount = await prisma.tag.count({
      where: {
        projectId: project.id,
      },
    });
    if (project.plan === "free" && tagsCount >= 3) {
      return res
        .status(403)
        .end(
          "You can only create 3 tags in the Free plan. Upgrade to Pro to create unlimited tags.",
        );
    }
    const { tag } = req.body;
    const response = await prisma.tag.create({
      data: {
        name: tag,
        color: randomBadgeColor(),
        projectId: project.id,
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
