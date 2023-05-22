import { randomBadgeColor } from "@/components/shared/badge";
import { withLinksAuth } from "@/lib/auth";
import { DUB_PROJECT_ID } from "@/lib/constants";
import prisma from "@/lib/prisma";

export default withLinksAuth(async (req, res, _session, project, domain) => {
  const { key } = req.query as { key: string };
  const { tag } = req.body as { tag: string };
  if (!key) {
    return res.status(400).json({ error: "Missing key" });
  }
  if (req.method === "POST") {
    const response = await prisma.link.update({
      where: {
        domain_key: {
          domain: domain || "dub.sh",
          key,
        },
      },
      data: {
        tag: {
          connectOrCreate: {
            where: {
              name_projectId: {
                name: tag,
                projectId: project?.id || DUB_PROJECT_ID,
              },
            },
            create: {
              name: tag,
              color: randomBadgeColor(),
              projectId: project?.id || DUB_PROJECT_ID,
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
          domain: domain || "dub.sh",
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
