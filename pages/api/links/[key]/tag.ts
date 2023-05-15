import { withLinksAuth } from "@/lib/auth";

export default withLinksAuth(
  async (req, res, _session, _project, domain) => {
    const { key, tagId } = req.query as { key: string; tagId: string };

    if (req.method === "POST") {
      const response = key;
      return res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredPlan: ["pro", "enterprise"],
  },
);
