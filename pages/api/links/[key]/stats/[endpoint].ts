import { NextApiRequest, NextApiResponse } from "next";
import { withUserAuth } from "@/lib/auth";
import { getStats, IntervalProps } from "@/lib/stats";

export default withUserAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/links/[key]/stats/[endpoint] - get link stats from Tinybird
    if (req.method === "GET") {
      const { key, endpoint, interval } = req.query as {
        key: string;
        endpoint: string;
        interval: IntervalProps;
      };
      const response = await getStats({
        domain: "dub.sh",
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
);
