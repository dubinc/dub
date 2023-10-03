import { withUserAuth } from "#/lib/auth";
import { domainExists } from "#/lib/api/domains";

export default withUserAuth(async (req, res) => {
  const { domain } = req.query as { domain: string };

  // GET /api/domains/[domain]/exists – check if a domain exists
  // This is used for project creation only, if you add a domain within an existing project,
  // use the /api/projects/[slug]/domains/[domain]/exists endpoint instead
  if (req.method === "GET") {
    const exists = await domainExists(domain);
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
