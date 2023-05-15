import { withLinksAuth } from "@/lib/auth";
import { getStats, IntervalProps } from "@/lib/stats";

export default withLinksAuth(
  async (req, res, _session, _project, domain) => {
    // GET /api/links/[key]/stats/[endpoint] - get link stats from Tinybird
    if (req.method === "GET") {
      const { key, endpoint, interval } = req.query as {
        key: string;
        endpoint: string;
        interval: IntervalProps;
      };
      const response = await getStats({
        domain: domain || "dub.sh",
        key,
        endpoint,
        interval,
      });

      if (!response) {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
      }

      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    needNotExceededUsage: true,
  },
);
