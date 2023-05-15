import { withLinksAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withLinksAuth(async (req, res, _session, _project, domain) => {
  const { key } = req.query as {
    key: string;
  };

  // GET /api/links/[key]/stats - get a link's stats page privacy
  if (req.method === "GET") {
    const link = await prisma.link.findUnique({
      where: {
        domain_key: {
          domain: domain || "dub.sh",
          key,
        },
      },
      select: {
        publicStats: true,
      },
    });

    return res.status(200).json(link);

    // PUT /api/links/[key]/stats - edit a link's stats page privacy
  } else if (req.method === "PUT") {
    const { publicStats } = req.body as { publicStats: boolean };
    const response = await prisma.link.update({
      where: {
        domain_key: {
          domain: domain || "dub.sh",
          key,
        },
      },
      data: {
        publicStats,
      },
    });

    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
