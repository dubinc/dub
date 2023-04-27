import { withProjectAuth } from "@/lib/auth";
import { getStats, IntervalProps } from "@/lib/stats";

export default withProjectAuth(
  async (req, res) => {
    // GET /api/projects/[slug]/links/[key]/stats/[endpoint] - get link stats from Tinybird
    if (req.method === "GET") {
      const { domain, key, endpoint, interval } = req.query as {
        domain: string;
        key: string;
        endpoint: string;
        interval: IntervalProps;
      };
      const response = await getStats({
        domain,
        key,
        endpoint,
        interval,
      });
      if (!response) {
        return res
          .status(405)
          .json({ error: `Method ${req.method} Not Allowed` });
      }

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  { needNotExceededUsage: true },
);
