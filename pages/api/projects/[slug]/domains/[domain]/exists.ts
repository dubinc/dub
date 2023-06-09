import { withProjectAuth } from "#/lib/auth";
import { domainExists } from "#/lib/api/domains";

export default withProjectAuth(async (req, res, project) => {
  const { domain } = req.query as { domain: string };

  // GET /api/projects/[slug]/domains/[domain]/exists – check if a domain exists
  if (req.method === "GET") {
    const exists = await domainExists(domain, project.id);
    if (exists) {
      return res.status(200).json(1);
    } else {
      return res.status(200).json(0);
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
