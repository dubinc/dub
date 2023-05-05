import { withProjectAuth } from "@/lib/auth";
import { getStats } from "@/lib/stats";

export default withProjectAuth(async (req, res) => {
  // GET /api/projects/[slug]/domains/[domain]/clicks - get # of clicks on root of domain (e.g. dub.sh, vercel.fyi)
  if (req.method === "GET") {
    const { domain } = req.query as {
      domain: string;
    };
    const response = await getStats({
      domain,
      key: "_root",
      endpoint: "clicks",
    });

    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
