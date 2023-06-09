import { randomBadgeColor } from "@/components/app/links/tag-badge";
import { withLinksAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withLinksAuth(async (req, res, _session, project, domain) => {
  const { key } = req.query as { key: string };
  const { tag } = req.body as { tag: string };
  if (!key) {
    return res.status(400).end("Missing key");
  }
  if (!project || !domain) {
    return res.status(400).end("Missing project or domain");
  }
  if (req.method === "POST") {
    const tags = await prisma.tag.findMany({
      where: {
        projectId: project.id,
      },
    });
    // if on a free plan and trying to create more than 3 tags
    if (
      project.plan === "free" &&
      tags.length >= 3 &&
      !tags.find((t) => t.name === tag)
    ) {
      return res
        .status(403)
        .end(
          "You can only create 3 tags in the Free plan. Upgrade to Pro to create unlimited tags.",
        );
    }
    const response = await prisma.link.update({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
      data: {
        tag: {
          connectOrCreate: {
            where: {
              name_projectId: {
                name: tag,
                projectId: project.id,
              },
            },
            create: {
              name: tag,
              color: randomBadgeColor(),
              projectId: project.id,
            },
          },
        },
      },
    });
    return res.status(200).json(response);
  } else if (req.method === "DELETE") {
    const response = await prisma.link.update({
      where: {
        domain_key: {
          domain,
          key,
        },
      },
      data: {
        tagId: null,
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
