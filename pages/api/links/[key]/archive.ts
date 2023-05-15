import { archiveLink } from "@/lib/api/links";
import { withLinksAuth } from "@/lib/auth";

export default withLinksAuth(async (req, res, _session, _project, domain) => {
  const { key } = req.query as { key: string };

  if (req.method === "POST") {
    const response = await archiveLink(domain || "dub.sh", key, true);
    return res.status(200).json(response);
  } else if (req.method === "DELETE") {
    const response = await archiveLink(domain || "dub.sh", key, false);
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
