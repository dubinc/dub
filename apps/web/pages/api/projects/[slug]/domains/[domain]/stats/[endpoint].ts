import { withProjectAuth } from "#/lib/auth";
import { IntervalProps, getStats } from "#/lib/stats";

export default withProjectAuth(async (req, res, project) => {
  // GET /api/projects/[slug]/domains/[domain]/clicks - get # of clicks on root of domain (e.g. dub.sh, vercel.fyi)
  if (req.method === "GET") {
    const { domain, endpoint, interval } = req.query as {
      domain: string;
      endpoint: string;
      interval: IntervalProps;
    };
    if (
      (interval === "all" || interval === "90d") &&
      (!project || project.plan === "free")
    ) {
      return res.status(403).end("Forbidden: Require higher plan");
    }

    const response = await getStats({
      domain,
      key: "_root",
      endpoint,
      interval,
    });

    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
